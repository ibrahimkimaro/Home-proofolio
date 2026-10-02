defmodule RealtimeChatWeb.UserSocket do
  use Phoenix.Socket

  channel "room:*", RealtimeChatWeb.ChatChannel
  channel "direct:*", RealtimeChatWeb.ChatChannel
  channel "admin:monitor", RealtimeChatWeb.AdminChannel
  channel "user:*", RealtimeChatWeb.UserChannel

  # Identity comes only from a token the backend signed (GET /chat/token), never from client params.
  @impl true
  def connect(%{"token" => token}, socket, _connect_info) when is_binary(token) do
    case verify(token) do
      {:ok, c} ->
        {:ok,
         assign(socket,
           user_id: c["sub"],
           name: c["name"] || c["username"],
           username: c["username"],
           admin: c["admin"] == true
         )}

      :error ->
        :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}"

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
