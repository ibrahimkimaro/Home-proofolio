defmodule RealtimeChatWeb.CallChannel do
  @moduledoc """
  "call:<id>": signaling for one 1:1 call (see RealtimeChat.Call), joined by exactly one device
  (browser tab) per side.

    * Caller joins with %{"to" => user_id, "media" => "audio" | "video", "device" => tab_id}: rings
      the callee's open tabs ("incoming_call" on their "user:<id>").
    * Callee joins with %{"device" => tab_id} to answer, then pushes "ready" once its media and
      peer connection exist; the caller gets "accepted" and sends the offer.
    * After a dropped socket either side rejoins with %{"device" => tab_id} (no "to"); the call
      waits 30s for it.

  Relayed to the other side: "signal" (an SDP offer/answer or an ICE candidate, validated and
  rebuilt so nothing else rides along) and "media" (mic/camera on or off). Pushed by the call:
  "accepted", "peer_reconnecting", "peer_rejoined", "ended" (then the channel closes).
  """
  use Phoenix.Channel, log_handle_in: false
  alias RealtimeChat.{Calls, RateLimit}

  @id ~r/^[A-Za-z0-9-]{8,64}$/
  @max_sdp 100_000
  # Ringing is the abusable part: 5 calls in a burst, then one per 10s.
  @call_burst 5
  @call_per_sec 0.1
  # A negotiation is an offer/answer plus a few dozen ICE candidates; renegotiations repeat it.
  @signal_burst 300
  @signal_per_sec 30

  @impl true
  def join("call:" <> id, %{"device" => device} = params, socket)
      when is_binary(device) and byte_size(device) in 8..64 do
    me = socket.assigns.user_id

    result =
      cond do
        not (id =~ @id) -> {:error, "invalid call"}
        not Map.has_key?(params, "to") -> Calls.join(id, me, device, self())
        not RateLimit.allow?({:call, me}, @call_burst, @call_per_sec) -> {:error, "slow down: too many calls"}
        true -> start(id, params, device, socket)
      end

    case result do
      {:ok, info} ->
        ice = Calls.ice_servers(me, socket.assigns[:host])
        {:ok, Map.put(info, :ice_servers, ice), assign(socket, :call_id, id)}

      {:error, reason} ->
        {:error, %{reason: reason}}
    end
  end

  def join("call:" <> _, _params, _socket), do: {:error, %{reason: "invalid call"}}

  defp start(id, params, device, socket) do
    caller = %{id: socket.assigns.user_id, name: socket.assigns.name, username: socket.assigns.username, device: device}
    media = if params["media"] == "video", do: "video", else: "audio"
    Calls.start(%{id: id, caller: caller, callee_id: params["to"], media: media, pid: self()})
  end

  @impl true
  def handle_in("signal", payload, socket) do
    with {:ok, clean} <- sanitize(payload),
         true <- RateLimit.allow?({:signal, socket.assigns.user_id}, @signal_burst, @signal_per_sec) || {:error, "slow down"},
         true <- Calls.member_pid?(socket.assigns.call_id, self()) || {:error, "not in this call"} do
      broadcast_from!(socket, "signal", clean)
      {:reply, :ok, socket}
    else
      {:error, reason} -> {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  def handle_in("media", %{"audio" => a, "video" => v}, socket) when is_boolean(a) and is_boolean(v) do
    broadcast_from!(socket, "media", %{audio: a, video: v})
    {:noreply, socket}
  end

  def handle_in("ready", _payload, socket), do: answer(Calls.ready(socket.assigns.call_id, socket.assigns.user_id), socket)
  def handle_in("hangup", _payload, socket), do: answer(Calls.hangup(socket.assigns.call_id, socket.assigns.user_id), socket)
  def handle_in(_event, _payload, socket), do: {:noreply, socket}

  @impl true
  def handle_info({:call_push, event, payload}, socket) do
    push(socket, event, payload)
    {:noreply, socket}
  end

  def handle_info({:call_ended, reason}, socket) do
    push(socket, "ended", %{reason: reason})
    {:stop, :normal, socket}
  end

  # Leaving the channel on purpose is hanging up (covers a hang-up before the join was even
  # confirmed). A closed socket is not: that side gets the reconnect grace period instead.
  @impl true
  def terminate({:shutdown, :left}, %{assigns: %{call_id: id, user_id: me}}) do
    if Calls.member_pid?(id, self()), do: Calls.hangup(id, me)
    :ok
  end

  def terminate(_reason, _socket), do: :ok

  defp answer(:ok, socket), do: {:reply, :ok, socket}
  defp answer({:error, reason}, socket), do: {:reply, {:error, %{reason: reason}}, socket}

  defp sanitize(%{"description" => %{"type" => type, "sdp" => sdp}})
       when type in ["offer", "answer"] and is_binary(sdp) and byte_size(sdp) <= @max_sdp,
       do: {:ok, %{description: %{type: type, sdp: sdp}}}

  # null = this side has gathered all its candidates.
  defp sanitize(%{"candidate" => nil}), do: {:ok, %{candidate: nil}}

  defp sanitize(%{"candidate" => %{"candidate" => c} = cand}) when is_binary(c) and byte_size(c) <= 1024 do
    {:ok,
     %{
       candidate: %{
         candidate: c,
         sdpMid: short_string(cand["sdpMid"]),
         sdpMLineIndex: if(is_integer(cand["sdpMLineIndex"]), do: cand["sdpMLineIndex"]),
         usernameFragment: short_string(cand["usernameFragment"])
       }
     }}
  end

  defp sanitize(_), do: {:error, "invalid signal"}

  defp short_string(s) when is_binary(s) and byte_size(s) <= 256, do: s
  defp short_string(_), do: nil
end
