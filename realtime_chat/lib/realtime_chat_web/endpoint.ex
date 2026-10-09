defmodule RealtimeChatWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :realtime_chat

  socket "/socket", RealtimeChatWeb.UserSocket,
    websocket: [
      check_origin: false,
      timeout: 45_000,
      # The host the browser used to reach us (x-forwarded-host when Next proxies /socket): the
      # default TURN host for calls (Calls.ice_servers/2).
      connect_info: [:uri, :x_headers]
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
