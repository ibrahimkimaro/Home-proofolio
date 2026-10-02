defmodule RealtimeChat.RateLimit do
  @moduledoc """
  Token bucket per key (e.g. {:msg, user_id}), shared by all of a user's tabs/conversations.
  ponytail: one node only (ETS); move to Redis/PubSub-synced counters if the chat runs on several nodes.
  """

  @table __MODULE__

  def init, do: :ets.new(@table, [:named_table, :public, write_concurrency: true])

  @doc "Spend a token: `burst` max, refilled at `per_sec`. false = over the limit."
  def allow?(key, burst, per_sec) do
    now = System.monotonic_time(:millisecond)

    {tokens, last} =
      case :ets.lookup(@table, key) do
        [{_, tokens, last}] -> {tokens, last}
        [] -> {burst, now}
      end

    tokens = min(burst, tokens + (now - last) * per_sec / 1000)
    allowed = tokens >= 1
    :ets.insert(@table, {key, if(allowed, do: tokens - 1, else: tokens), now})
    allowed
  end
end
