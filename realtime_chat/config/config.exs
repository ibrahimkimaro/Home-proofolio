import Config

config :realtime_chat, RealtimeChatWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: RealtimeChatWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: RealtimeChat.PubSub,
  live_view: [signing_salt: "ProofolioRealtimeLiveSalt123!"]

config :realtime_chat,
  generators: [timestamp_type: :utc_datetime]

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason
# Chat tokens arrive as socket params; keep them out of the logs.
config :phoenix, :filter_parameters, ["password", "token"]

import_config "#{config_env()}.exs"
