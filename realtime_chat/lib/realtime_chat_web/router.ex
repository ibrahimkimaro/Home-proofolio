defmodule RealtimeChatWeb.Router do
  use Phoenix.Router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", RealtimeChatWeb do
    pipe_through :api

    get "/health", HealthController, :index
    get "/api/status", HealthController, :status
  end
end
