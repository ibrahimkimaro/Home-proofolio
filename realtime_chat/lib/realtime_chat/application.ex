defmodule RealtimeChat.Application do
  use Application

  @impl true
  def start(_type, _args) do
    RealtimeChat.RateLimit.init()

    children = [
      {Phoenix.PubSub, name: RealtimeChat.PubSub},
      {Postgrex, [name: RealtimeChat.DB] ++ Application.fetch_env!(:realtime_chat, :db)},
      RealtimeChatWeb.Presence,
      {Registry, keys: :unique, name: RealtimeChat.CallRegistry},
      {DynamicSupervisor, name: RealtimeChat.CallSupervisor, strategy: :one_for_one},
      RealtimeChatWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: RealtimeChat.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    RealtimeChatWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
