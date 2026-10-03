defmodule RealtimeChatWeb.UserSocket do
  use Phoenix.Socket

  channel "room:*", RealtimeChatWeb.ChatChannel
  channel "direct:*", RealtimeChatWeb.ChatChannel
  channel "admin:monitor", RealtimeChatWeb.AdminChannel
  channel "user:*", RealtimeChatWeb.UserChannel
  channel "call:*", RealtimeChatWeb.CallChannel

  # Identity comes only from a token the backend signed (GET /chat/token), never from client params.
  @impl true
  def connect(%{"token" => token}, socket, connect_info) when is_binary(token) do
    case verify(token) do
      {:ok, c} ->
        {:ok,
         assign(socket,
           user_id: c["sub"],
           name: c["name"] || c["username"],
           username: c["username"],
           admin: c["admin"] == true,
           host: host(connect_info)
         )}

      :error ->
        :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}"

  # Hostname the browser used (port stripped). Behind Next's /socket proxy that's x-forwarded-host.
  defp host(connect_info) do
    forwarded = Enum.find_value(connect_info[:x_headers] || [], fn {k, v} -> k == "x-forwarded-host" && v end)

    case forwarded do
      h when is_binary(h) and h != "" -> URI.parse("//" <> (h |> String.split(",") |> hd() |> String.trim())).host
      _ -> connect_info[:uri] && connect_info[:uri].host
    end
  end

  # Token = base64url(json claims) <> "." <> base64url(HMAC-SHA256(secret, "chat." <> claims_part)).
  def verify(token) do
    secret = Application.fetch_env!(:realtime_chat, :secret_key)

    with [part, sig] <- String.split(token, "."),
         expected = Base.url_encode64(:crypto.mac(:hmac, :sha256, secret, "chat." <> part), padding: false),
         true <- Plug.Crypto.secure_compare(expected, sig),
         {:ok, json} <- Base.url_decode64(part, padding: false),
         {:ok, %{"sub" => sub, "exp" => exp} = claims} when is_binary(sub) <- Jason.decode(json),
         true <- is_integer(exp) and exp > System.system_time(:second) do
      {:ok, claims}
    else
      _ -> :error
    end
  end
end
