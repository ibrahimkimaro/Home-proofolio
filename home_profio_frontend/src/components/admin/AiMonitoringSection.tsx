"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  Clock,
  Cpu,
  Edit2,
  Filter,
  Key,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Unlock,
  UserCheck,
  UserX,
  Users,
  X,
  Zap,
  Sliders,
  Settings2,
  Eye,
  EyeOff,
  Globe,
  Server,
  Check,
  Play,
  HardDrive,
} from "lucide-react";
import {
  fetchAiMonitoring,
  probeGeminiApi,
  updateUserAiQuota,
  fetchAiConfig,
  updateAiConfig,
  testAiConfig,
  fetchLocalModels,
  benchmarkLocalModel,
  selectLocalModel,
  type AiMonitoringData,
  type AiMonitoringLog,
  type AiMonitoringUser,
  type GeminiProbeResult,
  type AiProviderConfig,
  type AiTestResult,
  type LocalAiModel,
  type LocalModelsResponse,
  type LocalModelBenchmarkResult,
} from "@/lib/api";
import { Avatar } from "./ui";

interface Props {
  onError: (msg: string) => void;
}

export function AiMonitoringSection({ onError }: Props) {
  const [data, setData] = useState<AiMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);

  // Probe state
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<GeminiProbeResult | null>(null);

  // Filtering & Search
  const [userSearch, setUserSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled" | "high">("all");

  // Edit Quota Modal
  const [selectedUser, setSelectedUser] = useState<AiMonitoringUser | null>(null);
  const [editLimit, setEditLimit] = useState(50000);
  const [editMonthlyLimit, setEditMonthlyLimit] = useState(1000000);
  const [editEnabled, setEditEnabled] = useState(true);
  const [editTier, setEditTier] = useState("standard");
  const [editNotes, setEditNotes] = useState("");
  const [savingQuota, setSavingQuota] = useState(false);

  // AI Provider & Model Configuration Modal
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiProviderConfig | null>(null);
  const [draftConfig, setDraftConfig] = useState<AiProviderConfig>({
    provider: "gemini",
    gemini: { api_key: "", model: "gemini-2.5-flash" },
    deepseek: { api_key: "", model: "deepseek-chat", base_url: "https://api.deepseek.com/v1" },
    mistral: { api_key: "", model: "mistral-small-latest", base_url: "https://api.mistral.ai/v1" },
    ollama: { base_url: "http://host.docker.internal:11435", model: "qwen2.5-coder:3b" },
    custom: { base_url: "", api_key: "", model: "" },
    temperature: 0.4,
    max_tokens: 4096,
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConfig, setTestingConfig] = useState(false);
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Local Models Discovery & Benchmarking State
  const [localModels, setLocalModels] = useState<LocalAiModel[]>([]);
  const [localModelsLoading, setLocalModelsLoading] = useState(false);
  const [localModelsError, setLocalModelsError] = useState<string | null>(null);
  const [localSystem, setLocalSystem] = useState<LocalModelsResponse["system"] | null>(null);
  const [benchmarkingModel, setBenchmarkingModel] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<Record<string, LocalModelBenchmarkResult>>({});
  const [benchmarkPrompt, setBenchmarkPrompt] = useState<string>(
    "Explain in 1 concise sentence what an AI assistant does."
  );
  const [selectingModel, setSelectingModel] = useState<string | null>(null);

  const handleScanLocalModels = async (customEndpoint?: string) => {
    setLocalModelsLoading(true);
    setLocalModelsError(null);
    try {
      const ep = customEndpoint || draftConfig.ollama?.base_url || "http://host.docker.internal:11435";
      const res = await fetchLocalModels(ep);
      if (res.ok) {
        setLocalModels(res.models || []);
        setLocalSystem(res.system);
        if (res.endpoint) {
          setDraftConfig((prev) => ({
            ...prev,
            ollama: { ...prev.ollama, base_url: res.endpoint },
          }));
        }
      } else {
        setLocalModelsError(res.message || "Could not discover local models");
      }
    } catch (err) {
      setLocalModelsError(err instanceof Error ? err.message : "Failed to scan local models");
    } finally {
      setLocalModelsLoading(false);
    }
  };

  const handleBenchmarkModel = async (modelName: string) => {
    setBenchmarkingModel(modelName);
    try {
      const ep = draftConfig.ollama?.base_url || "http://host.docker.internal:11435";
      const res = await benchmarkLocalModel({
        model: modelName,
        prompt: benchmarkPrompt,
        endpoint: ep,
      });
      setBenchmarks((prev) => ({ ...prev, [modelName]: res }));
      if (res.system) {
        setLocalSystem(res.system);
      }
    } catch (err) {
      setBenchmarks((prev) => ({
        ...prev,
        [modelName]: {
          ok: false,
          model: modelName,
          endpoint: "",
          prompt: benchmarkPrompt,
          duration_seconds: 0,
          error: err instanceof Error ? err.message : "Benchmark failed",
          message: err instanceof Error ? err.message : "Benchmark failed",
          system: localSystem || { cpu_percent: 0, ram_used_gb: 0, ram_total_gb: 0, ram_percent: 0 },
        },
      }));
    } finally {
      setBenchmarkingModel(null);
    }
  };

  const handleSelectModel = async (modelName: string) => {
    setSelectingModel(modelName);
    try {
      const ep = draftConfig.ollama?.base_url || "http://host.docker.internal:11435";
      const res = await selectLocalModel({
        model: modelName,
        endpoint: ep,
      });
      setAiConfig(res.config);
      setDraftConfig(res.config);
      setSaveSuccessMsg(`Active AI successfully switched to ${modelName}!`);
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setConfigModalOpen(false);
      }, 1500);
      await loadMonitoring(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to activate local model");
    } finally {
      setSelectingModel(null);
    }
  };

  const openConfigModal = async () => {
    setConfigModalOpen(true);
    setLoadingConfig(true);
    setTestResult(null);
    setSaveSuccessMsg(null);
    try {
      const cfg = await fetchAiConfig();
      setAiConfig(cfg);
      const ollamaUrl = cfg.ollama?.base_url || "http://host.docker.internal:11435";
      setDraftConfig({
        provider: cfg.provider || "gemini",
        gemini: { api_key: cfg.gemini?.api_key || "", model: cfg.gemini?.model || "gemini-2.5-flash" },
        deepseek: { api_key: cfg.deepseek?.api_key || "", model: cfg.deepseek?.model || "deepseek-chat", base_url: cfg.deepseek?.base_url || "https://api.deepseek.com/v1" },
        mistral: { api_key: cfg.mistral?.api_key || "", model: cfg.mistral?.model || "mistral-small-latest", base_url: cfg.mistral?.base_url || "https://api.mistral.ai/v1" },
        ollama: { base_url: ollamaUrl, model: cfg.ollama?.model || "qwen2.5-coder:3b" },
        custom: { base_url: cfg.custom?.base_url || "", api_key: cfg.custom?.api_key || "", model: cfg.custom?.model || "" },
        temperature: cfg.temperature ?? 0.4,
        max_tokens: cfg.max_tokens ?? 4096,
        updated_at: cfg.updated_at,
        updated_by: cfg.updated_by,
      });
      // Pre-fetch local models if provider is ollama or in background
      handleScanLocalModels(ollamaUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load AI configuration");
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleTestConfig = async () => {
    setTestingConfig(true);
    setTestResult(null);
    try {
      const res = await testAiConfig(draftConfig);
      setTestResult(res);
    } catch (err) {
      setTestResult({
        ok: false,
        latency_ms: 0,
        provider: draftConfig.provider,
        error: err instanceof Error ? err.message : "Connection failed",
        message: err instanceof Error ? err.message : "Connection test failed",
      });
    } finally {
      setTestingConfig(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await updateAiConfig(draftConfig);
      setAiConfig(res.config);
      setSaveSuccessMsg(`Active AI provider successfully set to ${res.config.provider}!`);
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setConfigModalOpen(false);
      }, 1500);
      await loadMonitoring(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save AI configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const loadMonitoring = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetchAiMonitoring(days);
        setData(res);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to load AI monitoring data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, onError]
  );

  useEffect(() => {
    loadMonitoring();
  }, [loadMonitoring]);

  const handleProbe = async () => {
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await probeGeminiApi();
      setProbeResult(res);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to probe Google Gemini API");
    } finally {
      setProbing(false);
    }
  };

  const openEditModal = (u: AiMonitoringUser) => {
    setSelectedUser(u);
    setEditLimit(u.daily_token_limit);
    setEditMonthlyLimit(u.monthly_token_limit);
    setEditEnabled(u.is_ai_enabled);
    setEditTier(u.tier || "standard");
    setEditNotes(u.notes || "");
  };

  const handleSaveQuota = async () => {
    if (!selectedUser) return;
    setSavingQuota(true);
    try {
      await updateUserAiQuota(selectedUser.id, {
        is_ai_enabled: editEnabled,
        daily_token_limit: Number(editLimit),
        monthly_token_limit: Number(editMonthlyLimit),
        tier: editTier,
        notes: editNotes,
      });
      setSelectedUser(null);
      await loadMonitoring(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update user quota");
    } finally {
      setSavingQuota(false);
    }
  };

  const handleToggleUser = async (u: AiMonitoringUser) => {
    try {
      await updateUserAiQuota(u.id, {
        is_ai_enabled: !u.is_ai_enabled,
        daily_token_limit: u.daily_token_limit,
        monthly_token_limit: u.monthly_token_limit,
        tier: u.tier,
        notes: u.notes,
      });
      await loadMonitoring(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to toggle user access");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brass-dark" />
          <p className="text-sm font-medium text-slate">Connecting to Gemini AI usage telemetry…</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Filter users
  const filteredUsers = (data.users || []).filter((u) => {
    const q = userSearch.toLowerCase();
    const matchesSearch =
      u.fullname.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === "active") return u.is_ai_enabled;
    if (statusFilter === "disabled") return !u.is_ai_enabled;
    if (statusFilter === "high") return u.usage_percent_today >= 50;
    return true;
  });

  const rpdLimit = data.rate_limits?.rpd_limit || 1500;
  const reqToday = data.usage_today?.requests_count || 0;
  const rpdPercentUsed = Math.min(100, Math.round((reqToday / rpdLimit) * 100));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-hairline bg-paper p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brass/15 text-brass-dark">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-ink-800">Gemini Model & API Telemetry</h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live Telemetry
              </span>
              <span className="rounded-md border border-hairline bg-paper-dim px-2 py-0.5 text-xs font-medium text-slate">
                Model: <strong className="text-ink-800">{data.model}</strong>
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate">
              Active Provider: <span className="font-semibold uppercase text-ink-700">{data.provider}</span> · Official Quotas:{" "}
              {data.rate_limits.rpm_limit} RPM · {data.rate_limits.tpm_limit.toLocaleString()} TPM · {data.rate_limits.rpd_limit.toLocaleString()} RPD
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openConfigModal}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-brass/50 bg-brass/10 px-3.5 py-2 text-xs font-semibold text-brass-dark shadow-2xs transition hover:bg-brass/20"
            title="Configure and switch between Gemini, DeepSeek, Mistral, Local Ollama, or Custom IP"
          >
            <Sliders className="h-3.5 w-3.5 text-brass-dark" />
            <span>AI Engine & Providers</span>
          </button>

          <button
            type="button"
            onClick={handleProbe}
            disabled={probing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-hairline bg-paper-dim px-3.5 py-2 text-xs font-semibold text-ink-800 transition hover:bg-brass/10 hover:text-brass-dark disabled:opacity-50"
          >
            {probing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
            {probing ? "Probing Gemini…" : "Quick Probe"}
          </button>

          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadMonitoring(true);
            }}
            disabled={refreshing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-hairline bg-paper px-3 py-2 text-xs font-medium text-slate transition hover:bg-paper-dim hover:text-ink-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brass-dark" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Live Probe Result Banner */}
      {probeResult && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-xs transition ${
            probeResult.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {probeResult.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            )}
            <div>
              <p className="font-bold">
                {probeResult.ok ? "Google Gemini API Connection Valid" : "API Connection Issue"}
              </p>
              <p className="mt-0.5 text-[11px] opacity-90">
                {probeResult.message} · Latency: <strong>{probeResult.latency_ms}ms</strong>
                {probeResult.display_name && ` · Model: ${probeResult.display_name}`}
                {probeResult.input_token_limit && ` · Context Window: ${probeResult.input_token_limit.toLocaleString()} tokens`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProbeResult(null)}
            className="cursor-pointer text-slate hover:text-ink-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Rate Limits & Core Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Daily Requests / RPD Card */}
        <div className="rounded-2xl border border-hairline bg-paper p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate">
            <span>Daily Requests (RPD)</span>
            <Activity className="h-4 w-4 text-brass-dark" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink-800">
              {reqToday.toLocaleString()}
            </span>
            <span className="text-xs text-slate">/ {rpdLimit.toLocaleString()} max</span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-medium text-slate">
              <span>{data.rate_limits.requests_remaining_today.toLocaleString()} remaining</span>
              <span>{rpdPercentUsed}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-paper-dim">
              <div
                className={`h-full rounded-full transition-all ${
                  rpdPercentUsed > 80 ? "bg-rose-500" : rpdPercentUsed > 50 ? "bg-amber-500" : "bg-brass"
                }`}
                style={{ width: `${Math.max(2, rpdPercentUsed)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tokens Today Card */}
        <div className="rounded-2xl border border-hairline bg-paper p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate">
            <span>Tokens Today</span>
            <Layers className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink-800">
              {data.usage_today.total_tokens.toLocaleString()}
            </span>
            <span className="text-xs text-slate">tokens</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3 text-[11px] text-slate">
            <span>Prompt: <strong className="text-ink-700">{data.usage_today.prompt_tokens.toLocaleString()}</strong></span>
            <span>Completion: <strong className="text-ink-700">{data.usage_today.completion_tokens.toLocaleString()}</strong></span>
          </div>
          <p className="mt-1 text-[11px] text-slate/80">
            All-time: {data.usage_all_time.total_tokens.toLocaleString()} tokens
          </p>
        </div>

        {/* Rate Limits & Latency Card */}
        <div className="rounded-2xl border border-hairline bg-paper p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate">
            <span>RPM & Latency</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink-800">
              {data.rate_limits.current_rpm}
            </span>
            <span className="text-xs text-slate">RPM (Limit: {data.rate_limits.rpm_limit})</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate">
            <span>Current TPM rate:</span>
            <strong className="text-ink-700">{data.rate_limits.current_tpm.toLocaleString()}</strong>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate">
            <span>Avg Response Time:</span>
            <strong className="text-ink-700">{data.usage_today.avg_latency_ms} ms</strong>
          </div>
        </div>

        {/* Errors & 429 Hits Card */}
        <div className="rounded-2xl border border-hairline bg-paper p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate">
            <span>Rate Limit Events (429)</span>
            <ShieldAlert className={`h-4 w-4 ${data.usage_today.rate_limit_hits > 0 ? "text-rose-500" : "text-emerald-500"}`} />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight ${data.usage_today.rate_limit_hits > 0 ? "text-rose-600" : "text-ink-800"}`}>
              {data.usage_today.rate_limit_hits}
            </span>
            <span className="text-xs text-slate">hits today</span>
          </div>
          <div className="mt-2.5">
            {data.usage_today.rate_limit_hits === 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> No rate-limit bottlenecks detected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" /> Quota throttle triggered today
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Feature & Breakdown Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Feature Breakdown */}
        <div className="rounded-2xl border border-hairline bg-paper p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-ink-800">Token Consumption by Feature</h3>
          <p className="mt-0.5 text-xs text-slate">Distribution across chat, dashboards, and tools</p>

          <div className="mt-4 space-y-3">
            {data.breakdown_by_feature.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate">No feature telemetry recorded yet today.</p>
            ) : (
              data.breakdown_by_feature.map((f) => {
                const total = data.usage_all_time.total_tokens || 1;
                const pct = Math.round((f.total_tokens / total) * 100);
                return (
                  <div key={f.feature} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium capitalize text-ink-700">
                        {f.feature.replace("_", " ")}
                      </span>
                      <span className="tabular-nums text-slate">
                        <strong>{f.total_tokens.toLocaleString()}</strong> tokens ({f.requests_count} calls)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-dim">
                      <div className="h-full bg-brass" style={{ width: `${Math.max(4, pct)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Model Specs & Key Overview */}
        <div className="rounded-2xl border border-hairline bg-paper p-5 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink-800">Gemini Key & Model Limits Configuration</h3>
              <p className="mt-0.5 text-xs text-slate">Hard quota ceilings imposed by Google Generative AI</p>
            </div>
            <span className="rounded-lg border border-hairline bg-paper-dim px-2.5 py-1 text-xs font-semibold text-ink-700">
              {data.model_specs.display_name}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-hairline/70 bg-paper-dim/60 p-3">
              <p className="text-[11px] font-medium uppercase text-slate">Requests Per Min (RPM)</p>
              <p className="mt-1 text-base font-bold text-ink-800">{data.rate_limits.rpm_limit} RPM</p>
              <p className="text-[11px] text-slate">Burstable ceiling</p>
            </div>
            <div className="rounded-xl border border-hairline/70 bg-paper-dim/60 p-3">
              <p className="text-[11px] font-medium uppercase text-slate">Tokens Per Min (TPM)</p>
              <p className="mt-1 text-base font-bold text-ink-800">{data.rate_limits.tpm_limit.toLocaleString()}</p>
              <p className="text-[11px] text-slate">Maximum input + output</p>
            </div>
            <div className="rounded-xl border border-hairline/70 bg-paper-dim/60 p-3">
              <p className="text-[11px] font-medium uppercase text-slate">Max Context Window</p>
              <p className="mt-1 text-base font-bold text-ink-800">
                {(data.rate_limits.context_window / 1000).toFixed(0)}k tokens
              </p>
              <p className="text-[11px] text-slate">Up to {data.rate_limits.max_output_tokens.toLocaleString()} out</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-brass/25 bg-brass/5 p-3 text-xs text-ink-700">
            <p className="font-semibold text-brass-dark">Enforced Per-User Token Limiting</p>
            <p className="mt-0.5 text-slate">
              System protects against Gemini 429 quota exhaustion by enforcing individual daily allowances. Users who exceed
              their daily allowance receive courteous notices without taking down system-wide API access.
            </p>
          </div>
        </div>
      </div>

      {/* Per-User AI Token & Rate Limit Management */}
      <div className="rounded-2xl border border-hairline bg-paper shadow-2xs">
        <div className="flex flex-col gap-4 border-b border-hairline/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-ink-800">User AI Token Quotas & Access Control</h3>
            <p className="mt-0.5 text-xs text-slate">
              Specify token allowances for every user, view individual consumption, and toggle AI access.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user, email…"
                className="h-9 w-48 rounded-xl border border-hairline bg-paper-dim pl-9 pr-3 text-xs text-ink-800 outline-none focus:border-brass/60 sm:w-60"
              />
              {userSearch && (
                <button
                  type="button"
                  onClick={() => setUserSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate hover:text-ink-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex rounded-xl border border-hairline bg-paper-dim p-0.5 text-xs font-medium">
              {(["all", "active", "disabled", "high"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setStatusFilter(mode)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 capitalize transition ${
                    statusFilter === mode
                      ? "bg-paper text-ink-800 shadow-2xs"
                      : "text-slate hover:text-ink-800"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-hairline/60 bg-paper-dim/50 font-semibold uppercase tracking-wider text-slate">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-4 py-3">AI Access</th>
                <th className="px-4 py-3">Daily Quota</th>
                <th className="px-4 py-3">Used Today</th>
                <th className="px-4 py-3">All-time Usage</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate">
                    No users match the search filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const limit = u.daily_token_limit;
                  const isUnlimited = limit <= 0;
                  const pct = isUnlimited ? 0 : u.usage_percent_today;
                  const isExceeded = !isUnlimited && u.tokens_today >= limit;

                  return (
                    <tr key={u.id} className="transition hover:bg-paper-dim/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.fullname || u.username} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-ink-800">{u.fullname}</span>
                              {u.is_admin && (
                                <span className="rounded bg-brass/15 px-1.5 py-0.2 text-[10px] font-bold text-brass-dark">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-slate">
                              @{u.username} · {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleUser(u)}
                          title={u.is_ai_enabled ? "Pause AI access" : "Enable AI access"}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                            u.is_ai_enabled
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                          }`}
                        >
                          {u.is_ai_enabled ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" /> Disabled
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-ink-700">
                        {isUnlimited ? (
                          <span className="font-semibold text-emerald-600">Unlimited</span>
                        ) : (
                          <span>{limit.toLocaleString()} tokens/day</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className={isExceeded ? "font-bold text-rose-600" : "text-ink-700"}>
                              {u.tokens_today.toLocaleString()}
                            </span>
                            <span className="text-slate">{isUnlimited ? "—" : `${pct}%`}</span>
                          </div>
                          {!isUnlimited && (
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-dim">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 100 ? "bg-rose-500" : pct >= 50 ? "bg-amber-500" : "bg-brass"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate">
                        <span className="font-semibold text-ink-800">{u.tokens_total.toLocaleString()}</span> tokens
                        <div className="text-[11px] text-slate/80">{u.requests_total} requests</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="rounded-md border border-hairline bg-paper-dim px-2 py-0.5 text-[11px] font-medium capitalize text-ink-700">
                          {u.tier || "standard"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-hairline px-2.5 py-1 text-xs font-semibold text-ink-700 transition hover:bg-paper-dim hover:text-ink-800"
                        >
                          <Edit2 className="h-3 w-3" />
                          Set Limit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Telemetry Request Log */}
      <div className="rounded-2xl border border-hairline bg-paper p-5 shadow-2xs">
        <h3 className="text-base font-bold text-ink-800">Real-Time AI Request Telemetry Log</h3>
        <p className="mt-0.5 text-xs text-slate">Recent invocations across chat companions, admin tools, and features</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-hairline/60 bg-paper-dim/50 font-semibold uppercase tracking-wider text-slate">
              <tr>
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Feature</th>
                <th className="px-4 py-2.5">Model</th>
                <th className="px-4 py-2.5">Tokens (Prompt / Compl)</th>
                <th className="px-4 py-2.5">Latency</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/50">
              {data.recent_logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate">
                    No requests recorded in the telemetry log yet.
                  </td>
                </tr>
              ) : (
                data.recent_logs.slice(0, 30).map((log) => {
                  const isErr = log.status === "error" || log.status === "rate_limited";
                  return (
                    <tr key={log.id} className="transition hover:bg-paper-dim/40">
                      <td className="px-4 py-2.5 text-slate">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-ink-800">{log.user_name}</td>
                      <td className="px-4 py-2.5 capitalize text-ink-700">
                        {log.feature.replace("_", " ")}
                      </td>
                      <td className="px-4 py-2.5 text-slate">{log.model}</td>
                      <td className="px-4 py-2.5 font-medium text-ink-800">
                        {log.total_tokens.toLocaleString()}{" "}
                        <span className="text-[11px] font-normal text-slate">
                          ({log.prompt_tokens} / {log.completion_tokens})
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate">
                        {log.latency_ms ? `${log.latency_ms}ms` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            log.status === "success"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : log.status === "rate_limited"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-rose-500/10 text-rose-600"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Quota Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-hairline bg-paper p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline/70 pb-3">
              <div>
                <h3 className="text-base font-bold text-ink-800">Configure AI Token Quota</h3>
                <p className="text-xs text-slate">for {selectedUser.fullname} (@{selectedUser.username})</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="cursor-pointer text-slate hover:text-ink-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Access Switch */}
              <div className="flex items-center justify-between rounded-xl border border-hairline bg-paper-dim p-3">
                <div>
                  <p className="font-semibold text-ink-800">AI Assistant Access</p>
                  <p className="text-[11px] text-slate">Toggle chat and automated tools for this user</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditEnabled(!editEnabled)}
                  className={`cursor-pointer rounded-full p-1 transition ${
                    editEnabled ? "text-emerald-600" : "text-slate"
                  }`}
                >
                  {editEnabled ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                </button>
              </div>

              {/* Daily Token Allowance */}
              <div>
                <label className="block font-semibold text-ink-700">Daily Token Limit</label>
                <p className="mb-1 text-[11px] text-slate">Set to -1 or 0 for unlimited allowance</p>
                <input
                  type="number"
                  value={editLimit}
                  onChange={(e) => setEditLimit(Number(e.target.value))}
                  className="w-full rounded-xl border border-hairline bg-paper-dim px-3.5 py-2 text-sm font-semibold text-ink-800 outline-none focus:border-brass/60"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[10000, 25000, 50000, 100000, 0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEditLimit(val)}
                      className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                        editLimit === val
                          ? "border-brass bg-brass/10 text-brass-dark"
                          : "border-hairline bg-paper text-slate hover:text-ink-800"
                      }`}
                    >
                      {val === 0 ? "Unlimited" : `${(val / 1000).toFixed(0)}k/day`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Token Allowance */}
              <div>
                <label className="block font-semibold text-ink-700">Monthly Token Limit</label>
                <input
                  type="number"
                  value={editMonthlyLimit}
                  onChange={(e) => setEditMonthlyLimit(Number(e.target.value))}
                  className="w-full rounded-xl border border-hairline bg-paper-dim px-3.5 py-2 text-sm font-semibold text-ink-800 outline-none focus:border-brass/60"
                />
              </div>

              {/* Tier Selection */}
              <div>
                <label className="block font-semibold text-ink-700">Account AI Tier</label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-hairline bg-paper-dim px-3.5 py-2 text-xs font-semibold text-ink-800 outline-none focus:border-brass/60"
                >
                  <option value="standard">Standard Member</option>
                  <option value="pro">Pro Creator</option>
                  <option value="vip">VIP / Unlimited</option>
                  <option value="restricted">Restricted / Low Token</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-ink-700">Admin Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Granted bonus tokens for project portfolio"
                  className="mt-1 w-full rounded-xl border border-hairline bg-paper-dim px-3.5 py-2 text-xs text-ink-800 outline-none focus:border-brass/60"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-hairline/70 pt-4">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="cursor-pointer rounded-xl border border-hairline px-4 py-2 text-xs font-medium text-slate transition hover:bg-paper-dim hover:text-ink-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuota}
                disabled={savingQuota}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-paper transition hover:bg-ink-700 disabled:opacity-50"
              >
                {savingQuota && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Quota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Provider & Models Configuration Modal */}
      {configModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-hairline bg-paper shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-hairline/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass/15 text-brass-dark">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-800">AI Provider & Multi-Model Engine</h3>
                  <p className="text-xs text-slate">
                    Switch between Gemini, DeepSeek, Mistral, Local Ollama, or Custom IP endpoints
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-slate hover:bg-paper-dim hover:text-ink-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs">
              {loadingConfig ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-brass-dark" />
                </div>
              ) : (
                <>
                  {/* Notification Banners */}
                  {saveSuccessMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-300">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      <p className="font-semibold">{saveSuccessMsg}</p>
                    </div>
                  )}

                  {testResult && (
                    <div
                      className={`flex items-start gap-2.5 rounded-xl border p-3.5 ${
                        testResult.ok
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                      }`}
                    >
                      {testResult.ok ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold">
                            {testResult.ok ? "Provider Connection Verified" : "Connection Failed"}
                          </p>
                          {testResult.ok && (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono">
                              <span className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                ⏱️ {testResult.duration_seconds ? `${testResult.duration_seconds}s` : `${testResult.latency_ms}ms`}
                              </span>
                              {testResult.tokens_per_second !== undefined && testResult.tokens_per_second > 0 && (
                                <span className="rounded bg-sky-500/10 text-sky-600 dark:text-sky-300 px-1.5 py-0.5 font-semibold">
                                  ⚡ {testResult.tokens_per_second} tok/s
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] opacity-90">{testResult.message}</p>
                        {testResult.system && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                            <span className="rounded bg-black/10 dark:bg-white/10 px-2 py-0.5 font-medium text-slate">
                              💻 CPU: {testResult.system.cpu_percent}%
                            </span>
                            <span className="rounded bg-black/10 dark:bg-white/10 px-2 py-0.5 font-medium text-slate">
                              🧠 RAM: {testResult.system.ram_used_gb} GB / {testResult.system.ram_total_gb} GB ({testResult.system.ram_percent}%)
                            </span>
                          </div>
                        )}
                        {testResult.reply && (
                          <p className="mt-1.5 rounded-lg border border-white/10 bg-black/20 p-2 font-mono text-[11px] opacity-90">
                            Reply: &ldquo;{testResult.reply}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Provider Selection Tabs */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-800 mb-2">
                      Active AI Engine Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {[
                        { id: "gemini", label: "Gemini", desc: "Google AI" },
                        { id: "deepseek", label: "DeepSeek", desc: "Chat & R1" },
                        { id: "mistral", label: "Mistral", desc: "Small / Large" },
                        { id: "ollama", label: "Local / IP", desc: "Ollama / Host" },
                        { id: "custom", label: "Custom", desc: "OpenAI Proxy" },
                      ].map((prov) => {
                        const active = draftConfig.provider === prov.id;
                        return (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={() =>
                              setDraftConfig((prev) => ({ ...prev, provider: prov.id as any }))
                            }
                            className={`cursor-pointer rounded-2xl border p-2.5 text-left transition ${
                              active
                                ? "border-brass bg-brass/10 text-ink-800 shadow-2xs"
                                : "border-hairline bg-paper-dim text-slate hover:border-slate/40 hover:text-ink-800"
                            }`}
                          >
                            <span className="block font-bold">{prov.label}</span>
                            <span className="block text-[10px] opacity-80">{prov.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Provider Specific Configuration Box */}
                  <div className="rounded-2xl border border-hairline/80 bg-paper-dim/60 p-4 space-y-3.5">
                    {/* Google Gemini Config */}
                    {draftConfig.provider === "gemini" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink-800">Google Gemini Configuration</span>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                            Default High-Speed Cloud
                          </span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">
                            Google AI API Key (leave blank to use system environment default)
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={draftConfig.gemini?.api_key || ""}
                              onChange={(e) =>
                                setDraftConfig((prev) => ({
                                  ...prev,
                                  gemini: { ...prev.gemini, api_key: e.target.value },
                                }))
                              }
                              placeholder="AQ... or AIza..."
                              className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 pr-9 text-xs text-ink-800 outline-none focus:border-brass/70"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-2.5 top-2.5 text-slate hover:text-ink-800"
                            >
                              {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">Model Name</label>
                          <input
                            type="text"
                            value={draftConfig.gemini?.model || "gemini-2.5-flash"}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                gemini: { ...prev.gemini, model: e.target.value },
                              }))
                            }
                            className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-xs text-ink-800 outline-none focus:border-brass/70"
                          />
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() =>
                                  setDraftConfig((prev) => ({
                                    ...prev,
                                    gemini: { ...prev.gemini, model: m },
                                  }))
                                }
                                className="cursor-pointer rounded-md border border-hairline bg-paper px-2 py-0.5 text-[10px] text-slate hover:text-ink-800"
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* DeepSeek Config */}
                    {draftConfig.provider === "deepseek" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink-800">DeepSeek Configuration</span>
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                            Deep Reasoning & Code
                          </span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">DeepSeek API Key</label>
                          <div className="relative">
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={draftConfig.deepseek?.api_key || ""}
                              onChange={(e) =>
                                setDraftConfig((prev) => ({
                                  ...prev,
                                  deepseek: { ...prev.deepseek, api_key: e.target.value },
                                }))
                              }
                              placeholder="sk-..."
                              className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 pr-9 text-xs text-ink-800 outline-none focus:border-brass/70"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-2.5 top-2.5 text-slate hover:text-ink-800"
                            >
                              {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">Base URL / Endpoint</label>
                          <input
                            type="text"
                            value={draftConfig.deepseek?.base_url || "https://api.deepseek.com/v1"}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                deepseek: { ...prev.deepseek, base_url: e.target.value },
                              }))
                            }
                            className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-xs text-ink-800 outline-none focus:border-brass/70"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">Model Name</label>
                          <input
                            type="text"
                            value={draftConfig.deepseek?.model || "deepseek-chat"}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                deepseek: { ...prev.deepseek, model: e.target.value },
                              }))
                            }
                            className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-xs text-ink-800 outline-none focus:border-brass/70"
                          />
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {["deepseek-chat", "deepseek-reasoner"].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() =>
                                  setDraftConfig((prev) => ({
                                    ...prev,
                                    deepseek: { ...prev.deepseek, model: m },
                                  }))
                                }
                                className="cursor-pointer rounded-md border border-hairline bg-paper px-2 py-0.5 text-[10px] text-slate hover:text-ink-800"
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Mistral AI Config */}
                    {draftConfig.provider === "mistral" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink-800">Mistral AI Configuration</span>
                          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                            Mistral Cloud Models
                          </span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">Mistral API Key</label>
                          <div className="relative">
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={draftConfig.mistral?.api_key || ""}
                              onChange={(e) =>
                                setDraftConfig((prev) => ({
                                  ...prev,
                                  mistral: { ...prev.mistral, api_key: e.target.value },
                                }))
                              }
                              placeholder="api key..."
                              className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 pr-9 text-xs text-ink-800 outline-none focus:border-brass/70"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-2.5 top-2.5 text-slate hover:text-ink-800"
                            >
                              {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">Base URL</label>
                          <input
                            type="text"
                            value={draftConfig.mistral?.base_url || "https://api.mistral.ai/v1"}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                mistral: { ...prev.mistral, base_url: e.target.value },
                              }))
                            }
                            className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-xs text-ink-800 outline-none focus:border-brass/70"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">Model Name</label>
                          <input
                            type="text"
                            value={draftConfig.mistral?.model || "mistral-small-latest"}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                mistral: { ...prev.mistral, model: e.target.value },
                              }))
                            }
                            className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-xs text-ink-800 outline-none focus:border-brass/70"
                          />
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {["mistral-small-latest", "mistral-large-latest", "codestral-latest"].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() =>
                                  setDraftConfig((prev) => ({
                                    ...prev,
                                    mistral: { ...prev.mistral, model: m },
                                  }))
                                }
                                className="cursor-pointer rounded-md border border-hairline bg-paper px-2 py-0.5 text-[10px] text-slate hover:text-ink-800"
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Local AI / Ollama IP Connection */}
                    {draftConfig.provider === "ollama" && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline/60 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-ink-800">Local AI & Ollama Model Hub</span>
                              <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                                Host Machine Inference
                              </span>
                            </div>
                            <p className="text-[11px] text-slate mt-0.5">
                              Discover, benchmark latency &amp; hardware usage, and switch between local AI models.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleScanLocalModels()}
                            disabled={localModelsLoading}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-hairline bg-paper px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-xs transition hover:bg-brass/10 hover:border-brass/50 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 text-brass ${localModelsLoading ? "animate-spin" : ""}`} />
                            {localModelsLoading ? "Scanning Host Models…" : "Scan Local Models"}
                          </button>
                        </div>

                        {/* Ollama Host Server URL */}
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">
                            Ollama Server Endpoint
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={draftConfig.ollama?.base_url || "http://host.docker.internal:11435"}
                              onChange={(e) =>
                                setDraftConfig((prev) => ({
                                  ...prev,
                                  ollama: { ...prev.ollama, base_url: e.target.value },
                                }))
                              }
                              placeholder="http://host.docker.internal:11435"
                              className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-xs text-ink-800 font-mono outline-none focus:border-brass/70"
                            />
                            <button
                              type="button"
                              onClick={() => handleScanLocalModels(draftConfig.ollama?.base_url)}
                              disabled={localModelsLoading}
                              className="cursor-pointer shrink-0 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-paper transition hover:bg-ink-700 disabled:opacity-50"
                            >
                              Connect
                            </button>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-slate font-medium">Quick Endpoints:</span>
                            {[
                              { label: "Host Bridge (socat :11435)", url: "http://host.docker.internal:11435" },
                              { label: "Direct Host (:11434)", url: "http://host.docker.internal:11434" },
                              { label: "Localhost", url: "http://localhost:11434" },
                              { label: "Docker Gateway", url: "http://172.17.0.1:11434" },
                            ].map((preset) => (
                              <button
                                key={preset.url}
                                type="button"
                                onClick={() => {
                                  setDraftConfig((prev) => ({
                                    ...prev,
                                    ollama: { ...prev.ollama, base_url: preset.url },
                                  }));
                                  handleScanLocalModels(preset.url);
                                }}
                                className="cursor-pointer rounded-md border border-hairline bg-paper px-2 py-0.5 text-[10px] font-mono text-slate hover:text-ink-800 hover:border-brass/50"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* System Resources Live Bar */}
                        {localSystem && (
                          <div className="rounded-xl border border-hairline bg-paper-dim/60 p-3">
                            <div className="flex items-center justify-between text-xs font-semibold text-ink-800 mb-2">
                              <span className="flex items-center gap-1.5">
                                <Server className="h-3.5 w-3.5 text-brass" />
                                Host Machine Hardware Resources
                              </span>
                              <span className="text-[11px] font-normal text-slate">
                                {localModels.filter((m) => m.is_running).length} model(s) warm in memory
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {/* CPU Usage */}
                              <div className="rounded-lg border border-hairline/80 bg-paper p-2.5">
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span className="flex items-center gap-1 text-slate font-medium">
                                    <Cpu className="h-3 w-3 text-sky-500" /> Host CPU
                                  </span>
                                  <span className="font-bold text-ink-800 font-mono">
                                    {localSystem.cpu_percent}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate/15">
                                  <div
                                    className={`h-full transition-all duration-500 ${
                                      localSystem.cpu_percent > 85
                                        ? "bg-rose-500"
                                        : localSystem.cpu_percent > 60
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, localSystem.cpu_percent))}%` }}
                                  />
                                </div>
                              </div>
                              {/* RAM Usage */}
                              <div className="rounded-lg border border-hairline/80 bg-paper p-2.5">
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span className="flex items-center gap-1 text-slate font-medium">
                                    <Activity className="h-3 w-3 text-purple-500" /> Host RAM
                                  </span>
                                  <span className="font-bold text-ink-800 font-mono">
                                    {localSystem.ram_used_gb} GB / {localSystem.ram_total_gb} GB ({localSystem.ram_percent}%)
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate/15">
                                  <div
                                    className={`h-full transition-all duration-500 ${
                                      localSystem.ram_percent > 85
                                        ? "bg-rose-500"
                                        : localSystem.ram_percent > 65
                                        ? "bg-amber-500"
                                        : "bg-purple-500"
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, localSystem.ram_percent))}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Benchmark Test Prompt Configuration */}
                        <div className="rounded-xl border border-hairline bg-paper p-3">
                          <label className="block text-[11px] font-medium text-slate mb-1">
                            Benchmark Test Message (Prompt to send for speed and resource test)
                          </label>
                          <input
                            type="text"
                            value={benchmarkPrompt}
                            onChange={(e) => setBenchmarkPrompt(e.target.value)}
                            placeholder="e.g. Explain in 1 concise sentence what an AI assistant does."
                            className="w-full rounded-lg border border-hairline bg-paper-dim px-3 py-1.5 text-xs text-ink-800 outline-none focus:border-brass/70"
                          />
                        </div>

                        {/* Local Models List / Cards */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-ink-800">
                              Discovered Local Models ({localModels.length})
                            </span>
                            <span className="text-[11px] text-slate">
                              Active: <span className="font-mono font-semibold text-brass">{draftConfig.ollama?.model || "none"}</span>
                            </span>
                          </div>

                          {localModelsLoading && (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-hairline/80 bg-paper-dim/40 p-8 text-center">
                              <Loader2 className="h-6 w-6 animate-spin text-brass mb-2" />
                              <p className="text-xs font-semibold text-ink-800">Querying Ollama host engine…</p>
                              <p className="text-[11px] text-slate">Discovering installed models &amp; active memory state</p>
                            </div>
                          )}

                          {localModelsError && !localModelsLoading && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-800 dark:text-rose-300">
                              <div className="flex items-start gap-2.5">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                                <div>
                                  <p className="font-bold text-xs">Could not connect to Ollama</p>
                                  <p className="mt-0.5 text-[11px] opacity-90">{localModelsError}</p>
                                  <p className="mt-2 text-[10px] text-slate font-mono">
                                    Hint: Try using endpoint <b>http://host.docker.internal:11435</b> (socat bridge) or ensure Ollama is running on the host.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleScanLocalModels()}
                                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
                                  >
                                    <RefreshCw className="h-3 w-3" /> Retry Scan
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {!localModelsLoading && !localModelsError && localModels.length === 0 && (
                            <div className="rounded-xl border border-hairline bg-paper-dim/40 p-6 text-center text-xs text-slate">
                              <Server className="mx-auto h-7 w-7 opacity-40 mb-2" />
                              <p className="font-semibold text-ink-800">No local models found on this endpoint</p>
                              <p className="text-[11px] mt-1">Make sure Ollama is running and has at least one model downloaded.</p>
                            </div>
                          )}

                          {!localModelsLoading && localModels.length > 0 && (
                            <div className="space-y-3">
                              {localModels.map((m) => {
                                const isCurrentActive = draftConfig.ollama?.model === m.name;
                                const bench = benchmarks[m.name];
                                const isBenchmarking = benchmarkingModel === m.name;
                                const isSelecting = selectingModel === m.name;

                                return (
                                  <div
                                    key={m.name}
                                    className={`relative rounded-xl border p-3.5 transition-all ${
                                      isCurrentActive
                                        ? "border-brass bg-brass/5 shadow-xs"
                                        : "border-hairline bg-paper hover:border-slate/40"
                                    }`}
                                  >
                                    {/* Header Row */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-ink-800">
                                          {m.name}
                                        </span>
                                        {m.is_running ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                            <Zap className="h-2.5 w-2.5 fill-current" /> In RAM / Warm
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-slate/10 px-2 py-0.5 text-[10px] font-medium text-slate">
                                            <HardDrive className="h-2.5 w-2.5" /> Installed on Disk
                                          </span>
                                        )}
                                        {isCurrentActive && (
                                          <span className="rounded-full bg-brass/20 px-2 py-0.5 text-[10px] font-bold text-brass-dark">
                                            Active System AI
                                          </span>
                                        )}
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleBenchmarkModel(m.name)}
                                          disabled={isBenchmarking || localModelsLoading}
                                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-hairline bg-paper-dim px-2.5 py-1 text-[11px] font-semibold text-ink-800 transition hover:bg-brass/10 hover:border-brass/60 disabled:opacity-50"
                                          title="Send test message and measure seconds & resources"
                                        >
                                          {isBenchmarking ? (
                                            <Loader2 className="h-3 w-3 animate-spin text-brass" />
                                          ) : (
                                            <Play className="h-3 w-3 text-emerald-600 fill-emerald-600" />
                                          )}
                                          {isBenchmarking ? "Testing Speed…" : "Test Model"}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleSelectModel(m.name)}
                                          disabled={isCurrentActive || isSelecting}
                                          className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-default ${
                                            isCurrentActive
                                              ? "bg-emerald-600 text-white"
                                              : "bg-ink text-paper hover:bg-ink-700"
                                          }`}
                                        >
                                          {isSelecting ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : isCurrentActive ? (
                                            <Check className="h-3 w-3" />
                                          ) : null}
                                          {isSelecting
                                            ? "Activating…"
                                            : isCurrentActive
                                            ? "Current AI"
                                            : "Use This Model"}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Spec Chips */}
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                                      {m.parameter_size && (
                                        <span className="rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 font-medium text-slate">
                                          Params: <b className="text-ink-800">{m.parameter_size}</b>
                                        </span>
                                      )}
                                      {m.quantization && (
                                        <span className="rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 font-medium text-slate">
                                          Quant: <b className="text-ink-800">{m.quantization}</b>
                                        </span>
                                      )}
                                      {m.size_formatted && (
                                        <span className="rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 font-medium text-slate">
                                          Disk Size: <b className="text-ink-800">{m.size_formatted}</b>
                                        </span>
                                      )}
                                      {m.is_running && (m.vram_used_gb > 0 || m.ram_used_gb > 0) && (
                                        <span className="rounded bg-purple-500/10 px-1.5 py-0.5 font-medium text-purple-700 dark:text-purple-300">
                                          Memory Footprint: <b>{m.vram_used_gb > 0 ? `${m.vram_used_gb} GB VRAM` : `${m.ram_used_gb} GB RAM`}</b>
                                        </span>
                                      )}
                                    </div>

                                    {/* Benchmark Test Result Display */}
                                    {bench && (
                                      <div
                                        className={`mt-2.5 rounded-lg border p-2.5 text-xs ${
                                          bench.ok
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                                            : "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                                        }`}
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold">
                                          <span className="flex items-center gap-1">
                                            {bench.ok ? (
                                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                            ) : (
                                              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                                            )}
                                            {bench.ok ? "Test Passed & Model Responded" : "Benchmark Test Failed"}
                                          </span>
                                          {bench.ok && (
                                            <div className="flex items-center gap-2 font-mono text-[11px]">
                                              <span className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                                                ⏱️ Response Time: {bench.duration_seconds}s
                                              </span>
                                              {bench.tokens_per_second !== undefined && bench.tokens_per_second > 0 && (
                                                <span className="rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 font-bold">
                                                  ⚡ {bench.tokens_per_second} tok/s
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {bench.system && (
                                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
                                            <span className="rounded bg-black/10 dark:bg-white/10 px-2 py-0.5 font-medium text-slate">
                                              💻 CPU: {bench.system.cpu_percent}%
                                            </span>
                                            <span className="rounded bg-black/10 dark:bg-white/10 px-2 py-0.5 font-medium text-slate">
                                              🧠 RAM: {bench.system.ram_used_gb} GB / {bench.system.ram_total_gb} GB ({bench.system.ram_percent}%)
                                            </span>
                                          </div>
                                        )}

                                        {bench.reply && (
                                          <div className="mt-2 rounded border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/30 p-2 font-mono text-[11px] leading-relaxed">
                                            <span className="font-sans font-semibold text-slate block text-[10px] mb-0.5">
                                              Response message ({bench.duration_seconds}s):
                                            </span>
                                            &ldquo;{bench.reply}&rdquo;
                                          </div>
                                        )}

                                        {!bench.ok && bench.error && (
                                          <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
                                            {bench.error}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Fallback / Manual Model Tag Input */}
                        <div className="pt-2 border-t border-hairline/60">
                          <label className="block text-[11px] font-medium text-slate mb-1">
                            Active Model Identifier (or type custom model name)
                          </label>
                          <input
                            type="text"
                            value={draftConfig.ollama?.model || "qwen2.5-coder:3b"}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                ollama: { ...prev.ollama, model: e.target.value },
                              }))
                            }
                            placeholder="e.g. qwen2.5-coder:3b"
                            className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-xs font-mono text-ink-800 outline-none focus:border-brass/70"
                          />
                        </div>
                      </div>
                    )}

                    {/* Custom OpenAI-Compatible Endpoint */}
                    {draftConfig.provider === "custom" && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink-800">Custom OpenAI-Compatible Endpoint</span>
                          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-600">
                            Universal Proxy / Router
                          </span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">
                            Base URL (e.g. http://192.168.1.50:8000/v1 or https://api.groq.com/openai/v1)
                          </label>
                          <input
                            type="text"
                            value={draftConfig.custom?.base_url || ""}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                custom: { ...prev.custom, base_url: e.target.value },
                              }))
                            }
                            placeholder="http://your-server-ip:8000/v1"
                            className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-xs text-ink-800 outline-none focus:border-brass/70 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">
                            API Key (optional if running unauthenticated local proxy)
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={draftConfig.custom?.api_key || ""}
                              onChange={(e) =>
                                setDraftConfig((prev) => ({
                                  ...prev,
                                  custom: { ...prev.custom, api_key: e.target.value },
                                }))
                              }
                              placeholder="Bearer token or sk-..."
                              className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 pr-9 text-xs text-ink-800 outline-none focus:border-brass/70"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-2.5 top-2.5 text-slate hover:text-ink-800"
                            >
                              {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate mb-1">Model Name</label>
                          <input
                            type="text"
                            value={draftConfig.custom?.model || ""}
                            onChange={(e) =>
                              setDraftConfig((prev) => ({
                                ...prev,
                                custom: { ...prev.custom, model: e.target.value },
                              }))
                            }
                            placeholder="model identifier"
                            className="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-xs text-ink-800 outline-none focus:border-brass/70"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Temperature & Token Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-slate mb-1">
                        <span>Temperature</span>
                        <span className="font-semibold text-ink-800">{draftConfig.temperature ?? 0.4}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={draftConfig.temperature ?? 0.4}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-brass-dark"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-slate mb-1">
                        <span>Max Response Tokens</span>
                        <span className="font-semibold text-ink-800">{draftConfig.max_tokens ?? 4096}</span>
                      </div>
                      <input
                        type="number"
                        min="256"
                        max="32768"
                        step="256"
                        value={draftConfig.max_tokens ?? 4096}
                        onChange={(e) =>
                          setDraftConfig((prev) => ({ ...prev, max_tokens: parseInt(e.target.value) || 4096 }))
                        }
                        className="w-full rounded-xl border border-hairline bg-paper px-3 py-1 text-xs text-ink-800 outline-none focus:border-brass/70"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline/80 bg-paper px-6 py-4">
              <button
                type="button"
                onClick={handleTestConfig}
                disabled={testingConfig || loadingConfig}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-hairline bg-paper-dim px-4 py-2 text-xs font-semibold text-ink-800 transition hover:bg-brass/10 hover:text-brass-dark disabled:opacity-50"
              >
                {testingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                {testingConfig ? "Testing Connection…" : "Test Connection"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="cursor-pointer rounded-xl border border-hairline px-4 py-2 text-xs font-medium text-slate transition hover:bg-paper-dim hover:text-ink-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig || loadingConfig}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-paper shadow-sm transition hover:bg-ink-700 disabled:opacity-50"
                >
                  {savingConfig && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save & Activate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
