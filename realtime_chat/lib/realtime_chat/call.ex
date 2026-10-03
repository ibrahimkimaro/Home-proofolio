defmodule RealtimeChat.Call do
  @moduledoc """
  One 1:1 voice/video call: a process per call, started by RealtimeChat.Calls.start/1.

  It registers {:call, id} plus {:user, caller} and {:user, callee} in RealtimeChat.CallRegistry
  (unique keys), so a user can be in at most one call: a second call to or from them fails with
  "busy" atomically, with no check-then-act race.

  Lifecycle: ringing -> active (the callee's device joined "call:<id>") -> stopped.
  Each side is bound to one device (a random id per browser tab) and its channel process is
  monitored. A side whose channel dies (socket drop, network switch) gets @grace_ms to rejoin
  from the same device before the call ends; the media itself is peer-to-peer and keeps flowing
  while signaling reconnects. Other tabs of the same user cannot take over a call.
  """
  use GenServer, restart: :temporary
  alias RealtimeChat.CallRegistry
  alias RealtimeChatWeb.Endpoint

  @ring_ms 45_000
  @grace_ms 30_000

  def start_link(args), do: GenServer.start_link(__MODULE__, args, name: via(args.id))

  def via(id), do: {:via, Registry, {CallRegistry, {:call, id}}}

  @impl true
  def init(%{id: id, caller: caller, callee: callee, media: media, pid: pid}) do
    # Registering both users is what makes "busy" atomic. On failure the process exits (as a
    # shutdown, so no crash report) and the keys it did register are released with it.
    with {:ok, _} <- register(caller.id, :self_busy),
         {:ok, _} <- register(callee.id, :busy) do
      state = %{
        id: id,
        media: media,
        status: :ringing,
        answered_at: nil,
        caller: Map.merge(caller, %{pid: nil, ref: nil, grace: nil}),
        callee: Map.merge(callee, %{device: nil, pid: nil, ref: nil, grace: nil}),
        ring_timer: Process.send_after(self(), :ring_timeout, @ring_ms)
      }

      Endpoint.broadcast("user:" <> callee.id, "incoming_call", %{
        call_id: id,
        media: media,
        from: %{id: caller.id, name: caller.name, username: caller.username}
      })

      Endpoint.broadcast("admin:monitor", "call", %{event: "ringing", media: media})
      {:ok, bind(state, :caller, pid)}
    else
      {:error, reason} -> {:stop, {:shutdown, reason}}
    end
  end

  defp register(user_id, reason) do
    case Registry.register(CallRegistry, {:user, user_id}, nil) do
      {:ok, _} = ok -> ok
      {:error, {:already_registered, _}} -> {:error, reason}
    end
  end

  # --- joins -------------------------------------------------------------------------------------

  @impl true
  def handle_call({:join, user_id, device, pid}, _from, state) do
    case side_of(state, user_id) do
      nil ->
        {:reply, {:error, "unauthorized"}, state}

      :caller ->
        if state.caller.device == device,
          do: {:reply, {:ok, info(state, :caller, true)}, bind(state, :caller, pid)},
          else: {:reply, {:error, "this call is on another device"}, state}

      :callee ->
        cond do
          state.status == :ringing ->
            # Answered on this device: every other tab of the callee stops ringing.
            Process.cancel_timer(state.ring_timer)
            Endpoint.broadcast("user:" <> user_id, "call_handled", %{call_id: state.id})
            Endpoint.broadcast("admin:monitor", "call", %{event: "answered", media: state.media})
            state = %{state | status: :active, answered_at: System.monotonic_time(:second)}
            state = put_in(state.callee.device, device)
            {:reply, {:ok, info(state, :callee, false)}, bind(state, :callee, pid)}

          state.callee.device == device ->
            {:reply, {:ok, info(state, :callee, true)}, bind(state, :callee, pid)}

          true ->
            {:reply, {:error, "answered on another device"}, state}
        end
    end
  end

  # The callee has its media and a peer connection ready: the caller may send the offer now.
  def handle_call({:ready, user_id}, _from, state) do
    if side_of(state, user_id) == :callee and state.status == :active do
      notify(state, :caller, "accepted", %{})
      {:reply, :ok, state}
    else
      {:reply, {:error, "not ready"}, state}
    end
  end

  def handle_call({:hangup, user_id, decline_reason}, _from, state) do
    case {side_of(state, user_id), state.status} do
      {nil, _} -> {:reply, {:error, "unauthorized"}, state}
      {:caller, :ringing} -> stop(state, "cancelled")
      {:callee, :ringing} -> stop(state, decline_reason)
      {_, :active} -> stop(state, "ended")
    end
  end

  def handle_call({:member_pid?, pid}, _from, state),
    do: {:reply, pid in [state.caller.pid, state.callee.pid], state}

  # --- timers and monitors -----------------------------------------------------------------------

  @impl true
  def handle_info(:ring_timeout, %{status: :ringing} = state), do: stop_noreply(state, "no_answer")
  def handle_info(:ring_timeout, state), do: {:noreply, state}

  def handle_info({:DOWN, ref, :process, _pid, _reason}, state) do
    case Enum.find([:caller, :callee], &(state[&1].ref == ref)) do
      nil ->
        {:noreply, state}

      side ->
        notify(state, other(side), "peer_reconnecting", %{})
        timer = Process.send_after(self(), {:grace_over, side}, @grace_ms)
        {:noreply, update_in(state[side], &%{&1 | pid: nil, ref: nil, grace: timer})}
    end
  end

  def handle_info({:grace_over, side}, state) do
    if state[side].pid, do: {:noreply, state}, else: stop_noreply(state, "connection_lost")
  end

  # --- helpers -----------------------------------------------------------------------------------

  defp bind(state, side, pid) do
    s = state[side]
    if s.ref, do: Process.demonitor(s.ref, [:flush])

    if s.grace do
      Process.cancel_timer(s.grace)
      notify(state, other(side), "peer_rejoined", %{})
    end

    put_in(state[side], %{s | pid: pid, ref: Process.monitor(pid), grace: nil})
  end

  defp info(state, side, rejoin) do
    peer = state[other(side)]

    %{
      call_id: state.id,
      role: Atom.to_string(side),
      media: state.media,
      rejoin: rejoin,
      peer: %{id: peer.id, name: peer.name, username: peer.username}
    }
  end

  defp side_of(state, user_id) do
    cond do
      state.caller.id == user_id -> :caller
      state.callee.id == user_id -> :callee
      true -> nil
    end
  end

  defp other(:caller), do: :callee
  defp other(:callee), do: :caller

  # Straight to that side's channel process (CallChannel pushes it to the browser).
  defp notify(state, side, event, payload) do
    if pid = state[side].pid, do: send(pid, {:call_push, event, payload})
  end

  defp stop(state, reason), do: {:stop, :normal, :ok, finish(state, reason)}
  defp stop_noreply(state, reason), do: {:stop, :normal, finish(state, reason)}

  defp finish(state, reason) do
    for side <- [:caller, :callee], state[side].pid, do: send(state[side].pid, {:call_ended, reason})
    # Ringing tabs of the callee (they never joined the call topic).
    Endpoint.broadcast("user:" <> state.callee.id, "call_ended", %{call_id: state.id, reason: reason})

    duration = if state.answered_at, do: System.monotonic_time(:second) - state.answered_at, else: 0
    Endpoint.broadcast("admin:monitor", "call", %{event: "ended", media: state.media, reason: reason, duration_s: duration})

    if state.status == :ringing and reason in ["no_answer", "cancelled", "connection_lost"] do
      RealtimeChat.Calls.notify_missed(state.callee.id, state.caller, state.media)
    end

    state
  end
end
