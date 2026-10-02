defmodule RealtimeChatWeb.Presence do
  use Phoenix.Presence,
    otp_app: :realtime_chat,
    pubsub_server: RealtimeChat.PubSub
end
