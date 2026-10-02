defmodule RealtimeChatWeb.UserChannel do
  @moduledoc """
  "user:<id>", joined by every open app tab of that user (only their own). Join replies with unread
  DM counts; then pushes "notice" for each new DM (whether or not that chat is open) and "online"
  (ids of everyone with the app open) when it changes. Joining it is what makes a user show online.
  """
  use Phoenix.Channel, log_handle_in: false
  alias RealtimeChat.Messages
  alias RealtimeChatWeb.Presence

  @impl true
  def join("user:" <> id, _params, socket) do
    if id == socket.assigns.user_id do
      send(self(), :after_join)
      {:ok, %{unread: Messages.unread_counts(id)}, assign(socket, :online, nil)}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    meta = %{name: socket.assigns.name, username: socket.assigns.username, topic: socket.topic}
    {:ok, _} = Presence.track(self(), "online", socket.assigns.user_id, meta)
    Phoenix.PubSub.subscribe(RealtimeChat.PubSub, "online")
    push_online(socket)
  end

  def handle_info(%Phoenix.Socket.Broadcast{topic: "online"}, socket), do: push_online(socket)

  @impl true
  def handle_in(_event, _payload, socket), do: {:noreply, socket}

  # ponytail: every user channel re-reads the whole list on each presence change (O(users²) work);
  # send joins/leaves diffs instead once there are thousands online.
  defp push_online(socket) do
    ids = "online" |> Presence.list() |> Map.keys() |> Enum.sort()

    if ids == socket.assigns.online do
      {:noreply, socket}
    else
      push(socket, "online", %{ids: ids})
      {:noreply, assign(socket, :online, ids)}
    end
  end
end
