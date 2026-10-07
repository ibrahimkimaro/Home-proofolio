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
  @older_page 100
  # How long after sending a member may still edit a message (a typo fix, not rewriting history).
  @edit_window 3600
  # Per user across all tabs and chats: bursts of 30 messages, then 1 every 0.5s on average.
  @msg_burst 30
  @msg_per_sec 2

  # A member removed from a group (InternalController) loses the room right away, not on next rejoin.
  intercept ["member_removed"]

  @impl true
  def handle_out("member_removed", %{user_id: id}, socket) do
    if id == socket.assigns.user_id do
      push(socket, "removed", %{})
      {:stop, :normal, socket}
    else
      push(socket, "member_removed", %{user_id: id})
      {:noreply, socket}
    end
  end

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
    cond do
      not (room =~ ~r/^[a-z0-9-]{1,64}$/) ->
        {:error, %{reason: "invalid room"}}

      # Rooms are groups: you must have accepted the invitation (or be its creator).
      not Messages.group_member?(room, socket.assigns.user_id) ->
        {:error, %{reason: "unauthorized"}}

      true ->
        do_join(topic, params, assign(socket, :recipient, nil))
    end
  end

  defp do_join(topic, params, socket) do
    case Messages.gate(socket.assigns.user_id, socket.assigns.recipient) do
      {:error, :suspended} -> {:error, %{reason: "Your account is suspended. Activate it to use chat; only support is open."}}
      _ -> do_join_ok(topic, params, socket)
    end
  end

  defp do_join_ok(topic, params, socket) do
    after_seq = if is_integer(params["after"]), do: params["after"], else: 0
    # What this member cleared with "Delete chat" stays gone for them (the others still have it).
    cleared = Messages.cleared_up_to(topic, socket.assigns.user_id)
    {messages, has_more} = Messages.page(topic, @join_page, after: after_seq, min: cleared)
    send(self(), :after_join)
    {:ok, %{messages: messages, has_more: has_more}, assign(socket, :cleared_up_to, cleared)}
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
    # A file (with an optional caption) or text; never neither.
    attachment = if p["attachment"], do: Messages.attachment(p["attachment"], socket.assigns.user_id), else: {:ok, nil}

    cond do
      String.length(text) > @max_len or (String.trim(text) == "" and attachment == {:ok, nil}) ->
        {:reply, {:error, %{reason: "message must be 1-#{@max_len} characters"}}, socket}

      match?({:error, _}, attachment) ->
        {:error, reason} = attachment
        {:reply, {:error, %{reason: reason}}, socket}

      not RateLimit.allow?({:msg, socket.assigns.user_id}, @msg_burst, @msg_per_sec) ->
        Endpoint.broadcast("admin:monitor", "refused", %{})
        {:reply, {:error, %{reason: "slow down: too many messages"}}, socket}

      (gate = Messages.gate(socket.assigns.user_id, socket.assigns.recipient, cid)) != :ok ->
        {:reply, {:error, %{reason: gate_reason(gate)}}, socket}

      true ->
        {:ok, att} = attachment
        store(cid, text, reply_to(p["reply_to"]), att, socket)
    end
  end

  def handle_in("new_msg", _payload, socket), do: {:reply, {:error, %{reason: "invalid message"}}, socket}

  def handle_in("older", %{"before" => before}, socket) when is_integer(before) do
    {messages, has_more} = Messages.page(socket.topic, @older_page, before: before, min: socket.assigns[:cleared_up_to] || 0)
    {:reply, {:ok, %{messages: messages, has_more: has_more}}, socket}
  end

  def handle_in("typing", payload, socket) do
    typing = payload["is_typing"] == true
    # "typing" or "uploading" (a file is on its way): shown as "… is typing" / "… is sending a file".
    activity = if payload["activity"] == "uploading", do: "uploading", else: "typing"
    ev = %{is_typing: typing, activity: activity, user_id: socket.assigns.user_id, author_name: socket.assigns.name, topic: socket.topic}
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

  # Fixing a typo: the author edits their own message, for a while after sending it.
  def handle_in("edit_msg", %{"id" => id, "text" => text}, socket) when is_binary(text) do
    text = String.trim(text)

    with {seq, ""} <- Integer.parse(to_string(id)),
         true <- String.length(text) in 1..@max_len,
         true <- RateLimit.allow?({:msg, socket.assigns.user_id}, @msg_burst, @msg_per_sec),
         {:ok, msg} <- Messages.edit(socket.topic, seq, socket.assigns.user_id, text, @edit_window) do
      broadcast!(socket, "msg_edited", msg)
      {:reply, {:ok, msg}, socket}
    else
      {:error, reason} -> {:reply, {:error, %{reason: reason}}, socket}
      _ -> {:reply, {:error, %{reason: "message must be 1-#{@max_len} characters"}}, socket}
    end
  end

  # Taking a message back: its author, or an admin of the group.
  def handle_in("delete_msg", %{"id" => id}, socket) do
    admin? =
      case socket.topic do
        "room:" <> slug -> Messages.group_admin?(slug, socket.assigns.user_id)
        _ -> false
      end

    with {seq, ""} <- Integer.parse(to_string(id)),
         {:ok, msg} <- Messages.delete(socket.topic, seq, socket.assigns.user_id, admin?) do
      broadcast!(socket, "msg_deleted", msg)
      {:reply, {:ok, msg}, socket}
    else
      {:error, reason} -> {:reply, {:error, %{reason: reason}}, socket}
      _ -> {:reply, {:error, %{reason: "invalid message"}}, socket}
    end
  end

  def handle_in(_event, _payload, socket), do: {:noreply, socket}

  defp gate_reason({:error, :suspended}), do: "Your account is suspended. Activate it to chat with members; only support is open."
  defp gate_reason({:error, :limit}), do: "You've used your 5 free messages. Activate your account to keep chatting (support is always open)."

  defp store(cid, text, reply_to, attachment, socket) do
    t0 = System.monotonic_time(:microsecond)

    case Messages.insert(socket.topic, socket.assigns, cid, text, reply_to, socket.assigns.recipient, attachment) do
      {:ok, msg} ->
        store_us = System.monotonic_time(:microsecond) - t0
        recipient = socket.assigns.recipient
        broadcast_from!(socket, "new_msg", msg)
        if recipient, do: notify(recipient, msg, socket), else: notify_room(msg, socket)
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
    preview = if msg.text == "" and msg.attachment, do: "📎 " <> msg.attachment["filename"], else: msg.text
    Task.start(fn -> Messages.notify(recipient, msg.author_name, socket.topic, preview) end)
    # Closed site / locked phone: a Web Push (its service worker stays quiet if the site is on screen).
    RealtimeChat.Push.notify([recipient], msg.author_name, preview, chat_url(socket.topic), socket.topic)
  end

  # A group message: every other accepted member gets a live notice (toast and sound in their open app,
  # which does not count it as a direct-message unread) and a Web Push for when the site is closed.
  defp notify_room(msg, %{topic: "room:" <> slug = topic}) do
    Task.start(fn ->
      case Messages.group_recipients(slug, msg.author_id) do
        {name, ids} ->
          preview = if msg.text == "" and msg.attachment, do: "📎 " <> msg.attachment["filename"], else: msg.text
          Enum.each(ids, &Endpoint.broadcast("user:" <> &1, "group_notice", Map.put(msg, :group_name, name)))
          RealtimeChat.Push.notify(ids, name, msg.author_name <> ": " <> preview, chat_url(topic), topic)

        _ ->
          :ok
      end
    end)
  end

  defp notify_room(_msg, _socket), do: :ok

  defp chat_url(topic), do: "/chat?c=" <> URI.encode_www_form(topic)

  defp reply_to(%{"id" => id, "text" => t, "author_name" => n} = r) when is_binary(id) and is_binary(t) and is_binary(n) do
    quoted = %{"id" => String.slice(id, 0, 64), "text" => String.slice(t, 0, 200), "author_name" => String.slice(n, 0, 100)}
    if is_binary(r["author_id"]) and byte_size(r["author_id"]) <= 64, do: Map.put(quoted, "author_id", r["author_id"]), else: quoted
  end

  defp reply_to(_), do: nil
end
