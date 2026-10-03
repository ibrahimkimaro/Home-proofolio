defmodule RealtimeChatWeb.InternalController do
  @moduledoc """
  POST /internal/events: the backend (FastAPI) asks for live pushes after it changed something,
  e.g. a group invitation or a "X joined the group" line it stored. Authorized by a token derived
  from SECRET_KEY (`Bearer hex(HMAC-SHA256(SECRET_KEY, "internal-events"))`), which browsers never get.

  Events (a list under "events"):
    * %{"type" => "user", "user_id" => id, "event" => "group_invite" | "groups_changed", "payload" => map}
      -> pushed to that user's open app tabs ("user:<id>").
    * %{"type" => "room_message", "topic" => "room:<slug>", "seq" => id}
      -> that stored message is broadcast to the room as "new_msg".
    * %{"type" => "member_removed", "topic" => "room:<slug>", "user_id" => id}
      -> that member's open room channels close (see ChatChannel.handle_out/3); others refresh.
  """
  use Phoenix.Controller, formats: [:json]
  alias RealtimeChat.Messages
  alias RealtimeChatWeb.Endpoint

  @user_events ["group_invite", "groups_changed"]

  def events(conn, %{"events" => events}) when is_list(events) do
    if authorized?(conn) do
      Enum.each(events, &dispatch/1)
      json(conn, %{ok: true})
    else
      conn |> put_status(401) |> json(%{error: "unauthorized"})
    end
  end

  def events(conn, _), do: conn |> put_status(400) |> json(%{error: "expected events"})

  def token do
    secret = Application.fetch_env!(:realtime_chat, :secret_key)
    Base.encode16(:crypto.mac(:hmac, :sha256, secret, "internal-events"), case: :lower)
  end

  defp authorized?(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> given] -> Plug.Crypto.secure_compare(given, token())
      _ -> false
    end
  end

  defp dispatch(%{"type" => "user", "user_id" => id, "event" => event} = e) when is_binary(id) and event in @user_events,
    do: Endpoint.broadcast("user:" <> id, event, e["payload"] || %{})

  defp dispatch(%{"type" => "room_message", "topic" => "room:" <> _ = topic, "seq" => seq}) when is_integer(seq) do
    case Messages.page(topic, 1, after: seq - 1, before: seq + 1) do
      {[msg], _} -> Endpoint.broadcast(topic, "new_msg", msg)
      _ -> :ok
    end
  end

  defp dispatch(%{"type" => "member_removed", "topic" => "room:" <> _ = topic, "user_id" => id}) when is_binary(id),
    do: Endpoint.broadcast(topic, "member_removed", %{user_id: id})

  defp dispatch(_), do: :ok
end
