defmodule RealtimeChatWeb.ChatChannel do
  @moduledoc """
  One conversation: "direct:<uuidA>_<uuidB>" (sorted, members only) or "room:<slug>" (any member).
  Join replies with the newest page of history (and has_more); "older" pages further back, so a
  dropped connection or a long absence never hides messages. "admin:monitor" only gets anonymous
  counts and timings (no text, names or conversation ids).
  """
  use Phoenix.Channel, log_handle_in: false
  alias RealtimeChat.{Messages, RateLimit}
  alias RealtimeChatWeb.{Endpoint, Presence}

  @max_len 4000
  @join_page 100
  @older_page 50
  # Per user across all tabs and chats: bursts of 30 messages, then 1 every 0.5s on average.
  @msg_burst 30
  @msg_per_sec 2

  @impl true
  def join("direct:" <> pair = topic, params, socket) do
    me = socket.assigns.user_id

    case String.split(pair, "_") do
      [a, b] when a < b and me in [a, b] ->
        do_join(topic, params, assign(socket, :recipient, if(me == a, do: b, else: a)))

      _ ->
        {:error, %{reason: "unauthorized"}}
    end
  end

  def join("room:" <> room = topic, params, socket) do
    if room =~ ~r/^[a-z0-9-]{1,64}$/,
      do: do_join(topic, params, assign(socket, :recipient, nil)),
      else: {:error, %{reason: "invalid room"}}
  end

  defp do_join(topic, params, socket) do
    after_seq = if is_integer(params["after"]), do: params["after"], else: 0
    {messages, has_more} = Messages.page(topic, @join_page, after: after_seq)
    send(self(), :after_join)
    {:ok, %{messages: messages, has_more: has_more}, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    meta = %{name: socket.assigns.name, username: socket.assigns.username, online_at: System.system_time(:second)}
    {:ok, _} = Presence.track(socket, socket.assigns.user_id, meta)
    {:ok, _} = Presence.track(self(), "online", socket.assigns.user_id, Map.put(meta, :topic, socket.topic))
    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def handle_in("new_msg", %{"id" => cid, "text" => text} = p, socket)
      when is_binary(cid) and byte_size(cid) in 1..64 and is_binary(text) do
    cond do
      String.trim(text) == "" or String.length(text) > @max_len ->
        {:reply, {:error, %{reason: "message must be 1-#{@max_len} characters"}}, socket}

      not RateLimit.allow?({:msg, socket.assigns.user_id}, @msg_burst, @msg_per_sec) ->
        Endpoint.broadcast("admin:monitor", "refused", %{})
        {:reply, {:error, %{reason: "slow down: too many messages"}}, socket}

      true ->
        store(cid, text, reply_to(p["reply_to"]), socket)
    end
  end

  def handle_in("new_msg", _payload, socket), do: {:reply, {:error, %{reason: "invalid message"}}, socket}

  def handle_in("older", %{"before" => before}, socket) when is_integer(before) do
    {messages, has_more} = Messages.page(socket.topic, @older_page, before: before)
    {:reply, {:ok, %{messages: messages, has_more: has_more}}, socket}
  end

  def handle_in("typing", payload, socket) do
    typing = payload["is_typing"] == true
    ev = %{is_typing: typing, user_id: socket.assigns.user_id, author_name: socket.assigns.name, topic: socket.topic}
    broadcast_from!(socket, "user_typing", ev)
    # DMs: also to the other person's app, so their chat list shows "typing…" when this chat isn't open.
    if socket.assigns.recipient, do: Endpoint.broadcast("user:" <> socket.assigns.recipient, "typing", ev)
    # Admin: a count of typers; the ref is an opaque hash, not a user or chat id.
    Endpoint.broadcast("admin:monitor", "typing", %{ref: :erlang.phash2({socket.assigns.user_id, socket.topic}), on: typing})
    {:noreply, socket}
  end

  # "I've seen everything up to seq": stored (DMs) so blue ticks and unread counts survive reloads.
  def handle_in("read_receipt", %{"up_to" => up_to}, socket) when is_integer(up_to) do
    if socket.assigns.recipient && RateLimit.allow?({:read, socket.assigns.user_id}, 30, 5) &&
         Messages.mark_read(socket.topic, socket.assigns.user_id, up_to) > 0 do
      Messages.clear_notification(socket.assigns.user_id, socket.topic)
      ev = %{reader_id: socket.assigns.user_id, up_to: up_to, read_at: DateTime.utc_now(), topic: socket.topic}
      broadcast_from!(socket, "messages_read", ev)
      Endpoint.broadcast("admin:monitor", "read", %{})
      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end

  def handle_in("reaction", %{"message_id" => id, "emoji" => emoji}, socket)
      when is_binary(id) and is_binary(emoji) and byte_size(emoji) <= 32 do
    broadcast_from!(socket, "msg_reaction", %{message_id: id, emoji: emoji, user_id: socket.assigns.user_id, user_name: socket.assigns.name})
    {:noreply, socket}
  end

  def handle_in(_event, _payload, socket), do: {:noreply, socket}

  defp store(cid, text, reply_to, socket) do
    t0 = System.monotonic_time(:microsecond)

    case Messages.insert(socket.topic, socket.assigns, cid, text, reply_to, socket.assigns.recipient) do
      {:ok, msg} ->
        store_us = System.monotonic_time(:microsecond) - t0
        recipient = socket.assigns.recipient
        broadcast_from!(socket, "new_msg", msg)
        if recipient, do: notify(recipient, msg, socket)
        Endpoint.broadcast("admin:monitor", "msg", %{kind: if(recipient, do: "direct", else: "room"), store_us: store_us})
        {:reply, {:ok, msg}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  # Recipient's app: live notice (unread badge, pop-up), and a bell notification for while it stays
  # unread (written after the ack, off the hot path; a read receipt clears it).
  defp notify(recipient, msg, socket) do
    Endpoint.broadcast("user:" <> recipient, "notice", msg)
    Task.start(fn -> Messages.notify(recipient, msg.author_name, socket.topic, msg.text) end)
  end

  defp reply_to(%{"id" => id, "text" => t, "author_name" => n}) when is_binary(id) and is_binary(t) and is_binary(n),
    do: %{"id" => id, "text" => String.slice(t, 0, 200), "author_name" => String.slice(n, 0, 100)}

  defp reply_to(_), do: nil
end
