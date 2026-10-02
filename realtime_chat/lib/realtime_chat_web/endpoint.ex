defmodule RealtimeChatWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :realtime_chat

  socket "/socket", RealtimeChatWeb.UserSocket,
    websocket: [
      check_origin: false,
      timeout: 45_000
    ],
    longpoll: false

  plug CORSPlug,
    origin: ["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    headers: ["*"]

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug RealtimeChatWeb.Router
end
