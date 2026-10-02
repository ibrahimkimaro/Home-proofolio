defmodule RealtimeChatWeb.HealthController do
  use Phoenix.Controller, formats: [:json]

  def index(conn, _params) do
    json(conn, %{
      status: "ok",
      service: "home_proofolio_elixir_phoenix",
      engine: "Elixir / Phoenix Channels",
      uptime_seconds: :erlang.element(1, :erlang.statistics(:wall_clock)) / 1000
    })
  end

  def status(conn, _params) do
    json(conn, %{
      status: "healthy",
      websockets: "active",
      presence: "active",
      channels: ["room:*", "direct:*"]
    })
  end
end
