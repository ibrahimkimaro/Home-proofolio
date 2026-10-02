defmodule RealtimeChatWeb.AdminChannel do
  @moduledoc """
  Admin chat analytics. Privacy by design: admins get counts and timings only, never message
  text, names, or who talks to whom. Join (and "stats") reply with aggregates from the database;
  live events from ChatChannel are anonymous: "msg" (kind, store time), "typing" (opaque ref),
  "read", "refused" (rate limited), plus "online" (a count).
  """
  use Phoenix.Channel, log_handle_in: false
  alias RealtimeChat.Messages
  alias RealtimeChatWeb.Presence

  @impl true
  def join("admin:monitor", _params, socket) do
    if socket.assigns.admin do
      send(self(), :after_join)
      {:ok, %{stats: Messages.stats()}, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    Phoenix.PubSub.subscribe(RealtimeChat.PubSub, "online")
    push_online(socket)
  end

  def handle_info(%Phoenix.Socket.Broadcast{topic: "online"}, socket), do: push_online(socket)

  @impl true
  def handle_in("stats", _payload, socket), do: {:reply, {:ok, Messages.stats()}, socket}

  # Round-trip probe for the admin panel's latency readout.
  def handle_in("ping", _payload, socket), do: {:reply, :ok, socket}

  def handle_in(_event, _payload, socket), do: {:noreply, socket}

  defp push_online(socket) do
    push(socket, "online", %{count: map_size(Presence.list("online"))})
    {:noreply, socket}
  end
end
