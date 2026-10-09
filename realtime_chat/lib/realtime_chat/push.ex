defmodule RealtimeChat.Push do
  @moduledoc """
  Asks the backend (FastAPI, POST /internal/push) to send a Web Push to some members' devices, so a message
  reaches them when the site is closed or the phone is locked. Fire-and-forget: the message is already stored
  and acked, and a member who is offline still sees it on their next load. The browser's service worker decides
  whether to show it (it stays quiet when the member is looking at the site: the page handles that case).

  Authorized by a token derived from SECRET_KEY (`Bearer hex(HMAC-SHA256(SECRET_KEY, "internal-push"))`).
  """
  require Logger

  def notify(user_ids, title, body, url, tag) when is_list(user_ids) and user_ids != [] do
    Task.start(fn -> post(user_ids, title, body, url, tag) end)
    :ok
  end

  def notify(_, _, _, _, _), do: :ok

  defp token do
    secret = Application.fetch_env!(:realtime_chat, :secret_key)
    Base.encode16(:crypto.mac(:hmac, :sha256, secret, "internal-push"), case: :lower)
  end

  defp post(user_ids, title, body, url, tag) do
    base = Application.get_env(:realtime_chat, :backend_url, "http://backend:8000")

    payload =
      Jason.encode!(%{
        user_ids: user_ids,
        title: String.slice(title, 0, 120),
        body: String.slice(body, 0, 300),
        url: url,
        tag: String.slice(tag, 0, 120)
      })

    request = {
      String.to_charlist(base <> "/internal/push"),
      [{~c"authorization", String.to_charlist("Bearer " <> token())}],
      ~c"application/json",
      payload
    }

    case :httpc.request(:post, request, [timeout: 5_000, connect_timeout: 2_000], []) do
      {:ok, {{_, status, _}, _, _}} when status in 200..299 -> :ok
      {:ok, {{_, status, _}, _, _}} -> Logger.warning("push request refused: HTTP #{status}")
      {:error, reason} -> Logger.warning("push request failed: #{inspect(reason)}")
    end
  rescue
    e -> Logger.warning("push request crashed: #{Exception.message(e)}")
  end
end
