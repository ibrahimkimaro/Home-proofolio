import Config

config :realtime_chat, RealtimeChatWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}, port: 4000],
  check_origin: false,
  debug_errors: true,
  code_reloader: false

config :logger, :console, format: "[$level] $message\n"
