defmodule RealtimeChatWeb.RoomChannel do
  use Phoenix.Channel
  alias RealtimeChatWeb.Presence

  @impl true
  def join("room:" <> room_id, _params, socket) do
    send(self(), :after_join)
    {:ok, %{room: room_id, user_id: socket.assigns.user_id}, assign(socket, :room_id, room_id)}
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} =
      Presence.track(socket, socket.assigns.user_id, %{
        online_at: inspect(System.system_time(:second)),
        name: socket.assigns.name,
        username: socket.assigns.username,
        avatar: socket.assigns.avatar
      })

    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def handle_in("new_msg", payload, socket) do
    msg_id = payload["id"] || "msg_#{System.unique_integer([:positive, :monotonic])}"
    timestamp = payload["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()

    enriched = %{
      "id" => msg_id,
      "text" => payload["text"] || "",
      "author_id" => socket.assigns.user_id,
      "author_name" => socket.assigns.name,
      "author_username" => socket.assigns.username,
      "avatar" => socket.assigns.avatar,
      "timestamp" => timestamp,
      "room_id" => socket.assigns.room_id,
      "status" => "delivered",
      "media_url" => payload["media_url"],
      "reply_to" => payload["reply_to"]
    }

    broadcast!(socket, "new_msg", enriched)
    {:reply, {:ok, enriched}, socket}
  end

  @impl true
  def handle_in("typing", payload, socket) do
    is_typing = payload["is_typing"] == true
    broadcast_from!(socket, "user_typing", %{
      "user_id" => socket.assigns.user_id,
      "author_name" => socket.assigns.name,
      "is_typing" => is_typing,
      "room_id" => socket.assigns.room_id
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("reaction", %{"message_id" => msg_id, "emoji" => emoji}, socket) do
    broadcast!(socket, "msg_reaction", %{
      "message_id" => msg_id,
      "emoji" => emoji,
      "user_id" => socket.assigns.user_id,
      "user_name" => socket.assigns.name
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in(event, payload, socket) do
    broadcast_from!(socket, event, payload)
    {:noreply, socket}
  end
end
