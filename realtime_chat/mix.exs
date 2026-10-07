defmodule RealtimeChat.MixProject do
  use Mix.Project

  def project do
    [
      app: :realtime_chat,
      version: "0.1.0",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      mod: {RealtimeChat.Application, []},
      extra_applications: [:logger, :runtime_tools, :inets]
    ]
  end

  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      {:phoenix, "~> 1.7.14"},
      {:phoenix_pubsub, "~> 2.1"},
      {:bandit, "~> 1.5"},
      {:jason, "~> 1.4"},
      {:cors_plug, "~> 3.0"},
      {:postgrex, "~> 0.19"}
    ]
  end
end
