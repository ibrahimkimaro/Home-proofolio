defmodule RealtimeChat.Calls do
  @moduledoc """
  1:1 voice/video calls. Phoenix only does signaling here (who calls whom, SDP offers/answers, ICE
  candidates); audio and video go peer-to-peer over WebRTC, encrypted end to end with DTLS-SRTP.
  When two peers can't reach each other directly (strict NAT, corporate firewall) the media is
  relayed by the TURN server (coturn), which only ever sees the encrypted packets.

  ponytail: one node only (local Registry); use :global or Horde if the chat runs on several nodes.
  """
  alias RealtimeChat.{Call, CallRegistry, CallSupervisor}
  alias RealtimeChatWeb.Presence
  require Logger

  @db RealtimeChat.DB
  @uuid ~r/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  # TURN credentials are checked again on every allocation refresh, so they must outlive the call.
  @turn_ttl 12 * 3600

  @doc "Ring `callee_id`. The caller's channel process `pid` is bound to the call."
  def start(%{id: id, caller: caller, callee_id: callee_id, media: media, pid: pid}) do
    with :ok <- check_callee(caller, callee_id),
         {:ok, callee} <- lookup_user(callee_id),
         :ok <- check_online(callee_id, caller, media) do
      args = %{id: id, caller: caller, callee: callee, media: media, pid: pid}

      case DynamicSupervisor.start_child(CallSupervisor, {Call, args}) do
        {:ok, _} -> {:ok, %{call_id: id, role: "caller", media: media, rejoin: false, peer: callee}}
        {:error, {:already_started, _}} -> {:error, "call id taken, retry"}
        {:error, {:shutdown, :busy}} -> {:error, "busy"}
        {:error, {:shutdown, :self_busy}} -> {:error, "you are already in a call"}
      end
    end
  end

  def join(id, user_id, device, pid), do: call(id, {:join, user_id, device, pid})
  def ready(id, user_id), do: call(id, {:ready, user_id})
  @doc "`decline_reason` is what the caller is told when the callee turns down a ringing call."
  def hangup(id, user_id, decline_reason \\ "declined"), do: call(id, {:hangup, user_id, decline_reason})

  @doc "Is `pid` the channel currently bound to a side of this call (not a stale one)?"
  def member_pid?(id, pid), do: call(id, {:member_pid?, pid}) == true

  def count, do: Registry.count_select(CallRegistry, [{{{:call, :_}, :_, :_}, [], [true]}])

  defp call(id, msg) do
    GenServer.call(Call.via(id), msg)
  catch
    :exit, _ -> {:error, "call ended"}
  end

  defp check_callee(caller, callee_id) do
    cond do
      not is_binary(callee_id) or not (callee_id =~ @uuid) -> {:error, "unknown user"}
      callee_id == caller.id -> {:error, "you can't call yourself"}
      true -> :ok
    end
  end

  defp lookup_user(id) do
    sql = """
    SELECT u.id::text, coalesce(p.display_name, u.fullname, u.username), u.username
    FROM users u LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = $1::text::uuid AND u.is_active
    """

    case Postgrex.query(@db, sql, [id]) do
      {:ok, %{rows: [[id, name, username]]}} -> {:ok, %{id: id, name: name, username: username}}
      {:ok, _} -> {:error, "unknown user"}
      {:error, err} ->
        Logger.error("call lookup failed: #{Exception.message(err)}")
        {:error, "try again"}
    end
  end

  # No app tab open = nobody to ring: tell the caller now, and leave a missed-call notification.
  defp check_online(callee_id, caller, media) do
    if Presence.get_by_key("online", callee_id) == [] do
      notify_missed(callee_id, caller, media)
      {:error, "offline"}
    else
      :ok
    end
  end

  def notify_missed(callee_id, caller, media) do
    title = String.slice("Missed #{if media == "video", do: "video", else: "voice"} call from #{caller.name}", 0, 160)
    link = "/chat?c=" <> URI.encode_www_form("direct:" <> Enum.join(Enum.sort([caller.id, callee_id]), "_"))

    Task.start(fn ->
      Postgrex.query(
        @db,
        "INSERT INTO notifications (id, user_id, kind, title, link) VALUES (gen_random_uuid(), $1::text::uuid, 'call', $2, $3)",
        [callee_id, title, link]
      )
    end)
  end

  @default_stun_servers [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302",
    "stun:stun3.l.google.com:19302",
    "stun:stun4.l.google.com:19302",
    "stun:stun.cloudflare.com:3478"
  ]

  @doc """
  RTCPeerConnection iceServers for this user. TURN credentials follow the TURN REST API that
  coturn's `use-auth-secret` verifies: username "<expiry>:<user_id>", password
  base64(HMAC-SHA1(TURN_SECRET, username)). They expire, so a leaked one is useless later, and
  the secret itself never reaches the browser. `host` is the hostname the client used to reach
  this server, the TURN host when TURN_HOST isn't set (works for localhost and LAN dev alike).
  """
  def ice_servers(user_id, host) do
    cfg = Application.get_env(:realtime_chat, :ice, [])

    # Check if client reached us via an HTTP tunnel where UDP/TCP 3478 is not forwarded.
    is_tunnel =
      is_binary(host) and
        (String.contains?(host, "devtunnels.ms") or
         String.contains?(host, "ngrok") or
         String.contains?(host, "zrok") or
         String.contains?(host, "loca.lt") or
         String.contains?(host, "trycloudflare.com"))

    # Only use host for local coturn if turn_host is explicitly set OR host is a real local/LAN host.
    turn_host_candidate = cfg[:turn_host] || (if not is_tunnel, do: host, else: nil)
    h = if turn_host_candidate, do: bracket(turn_host_candidate), else: nil
    port = cfg[:turn_port] || 3478

    # 1. Gather all STUN servers (local coturn STUN + Google/Cloudflare global STUN pool)
    local_stun = if h && cfg[:turn_secret], do: ["stun:#{h}:#{port}"], else: []

    stun_list =
      case cfg[:stun_urls] do
        urls when is_binary(urls) and urls != "" ->
          String.split(urls, ",", trim: true)

        _ ->
          local_stun ++ @default_stun_servers
      end

    base_servers = [%{urls: Enum.uniq(stun_list)}]

    # 2. Add local Coturn if valid host is known and not on a tunnel without port forwarding
    local_turn =
      if h && is_binary(cfg[:turn_secret]) && cfg[:turn_secret] != "" do
        username = "#{System.system_time(:second) + @turn_ttl}:#{user_id}"
        tls = if cfg[:turns_port], do: ["turns:#{h}:#{cfg[:turns_port]}?transport=tcp"], else: []

        [
          %{
            urls: ["turn:#{h}:#{port}?transport=udp", "turn:#{h}:#{port}?transport=tcp"] ++ tls,
            username: username,
            credential: Base.encode64(:crypto.mac(:hmac, :sha, cfg[:turn_secret], username))
          }
        ]
      else
        []
      end

    # 3. Add external cloud TURN if configured (e.g. Metered.ca, Twilio, etc.)
    external_turn =
      case {cfg[:external_turn_urls], cfg[:external_turn_username], cfg[:external_turn_credential]} do
        {urls, u, p} when is_binary(urls) and urls != "" and is_binary(u) and is_binary(p) ->
          turn_urls = String.split(urls, ",", trim: true)
          [%{urls: turn_urls, username: u, credential: p}]

        _ ->
          []
      end

    base_servers ++ local_turn ++ external_turn
  end

  defp bracket(host), do: if(String.contains?(host, ":"), do: "[#{host}]", else: host)
end
