"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Table2, Check, Copy } from "lucide-react";

export interface ChartSpec {
  type?: "bar" | "horizontal_bar" | "barh" | "line" | "area" | "pie" | "donut";
  title?: string;
  description?: string;
  data: Record<string, any>[];
  xKey?: string;
  series?: {
    key: string;
    label?: string;
    color?: string;
  }[];
  colors?: string[];
}

const PALETTE = [
  "#38bdf8", // Sky blue
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#06b6d4", // Cyan
  "#8b5cf6", // Violet
  "#ec4899", // Pink
];

/** tall: the chart fills the workspace (about half the screen) instead of sitting in a chat bubble. */
export function AiChart({ spec, tall = false }: { spec: ChartSpec; tall?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [copied, setCopied] = useState(false);
  const [currentType, setCurrentType] = useState<string>(spec.type || "bar");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!spec || !Array.isArray(spec.data) || spec.data.length === 0) {
    return null;
  }

  const rawData = spec.data;
  const xKey = spec.xKey || "name";

  // Determine series to plot if not explicitly provided
  let series = spec.series;
  if (!series || series.length === 0) {
    const firstRow = rawData[0] || {};
    const numericKeys = Object.keys(firstRow).filter(
      (k) => k !== xKey && typeof firstRow[k] === "number"
    );
    if (numericKeys.length > 0) {
      series = numericKeys.map((k, i) => ({
        key: k,
        label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        color: PALETTE[i % PALETTE.length],
      }));
    } else {
      series = [{ key: "value", label: "Value", color: PALETTE[0] }];
    }
  }

  const copyData = () => {
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHorizontalBar = currentType === "horizontal_bar" || currentType === "barh";
  const isLine = currentType === "line";
  const isArea = currentType === "area";
  const isPie = currentType === "pie" || currentType === "donut";

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-b from-sky-950/20 via-zinc-900/90 to-black/90 p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          {spec.title && (
            <h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                {isPie ? <PieIcon className="h-3.5 w-3.5" /> : isLine ? <LineIcon className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
              </span>
              {spec.title}
            </h4>
          )}
          {spec.description && (
            <p className="mt-0.5 text-xs text-zinc-400">{spec.description}</p>
          )}
        </div>

        {/* View / Type controls */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="flex rounded-lg bg-white/5 p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => setCurrentType("bar")}
              className={`rounded px-2 py-1 transition ${
                currentType === "bar" ? "bg-sky-500 text-white shadow" : "text-zinc-400 hover:text-white"
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentType("line")}
              className={`rounded px-2 py-1 transition ${
                currentType === "line" ? "bg-sky-500 text-white shadow" : "text-zinc-400 hover:text-white"
              }`}
              title="Line Chart"
            >
              <LineIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentType("pie")}
              className={`rounded px-2 py-1 transition ${
                currentType === "pie" ? "bg-sky-500 text-white shadow" : "text-zinc-400 hover:text-white"
              }`}
              title="Pie Chart"
            >
              <PieIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === "chart" ? "table" : "chart")}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10 transition"
          >
            <Table2 className="h-3.5 w-3.5 text-zinc-400" />
            <span>{viewMode === "chart" ? "Table" : "Chart"}</span>
          </button>

          <button
            type="button"
            onClick={copyData}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10 transition"
            title="Copy Raw Spec"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-2">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400">
                <th className="py-1.5 px-3 font-semibold uppercase">{xKey}</th>
                {series.map((s) => (
                  <th key={s.key} className="py-1.5 px-3 font-semibold uppercase text-right">
                    {s.label || s.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawData.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-1.5 px-3 font-medium text-white">{String(row[xKey] ?? "")}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1.5 px-3 text-right font-mono text-sky-400">
                      {row[s.key] !== undefined ? String(row[s.key]) : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`w-full pt-2 ${tall ? "h-[min(55vh,34rem)] min-h-64" : "h-64"}`}>
          {!mounted ? (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              Loading visualization...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {isPie ? (
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(10, 15, 25, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                    }}
                    itemStyle={{ color: "#38bdf8" }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-zinc-300">{val}</span>}
                  />
                  <Pie
                    data={rawData}
                    dataKey={series[0]?.key || "value"}
                    nameKey={xKey}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={spec.type === "donut" ? 45 : 0}
                    paddingAngle={3}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ""}: ${(((percent ?? 0)) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {rawData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={spec.colors?.[index] || PALETTE[index % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              ) : isLine ? (
                <LineChart data={rawData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis
                    dataKey={xKey}
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(10, 15, 25, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  {series.length > 1 && <Legend verticalAlign="top" />}
                  {series.map((s, idx) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label || s.key}
                      stroke={s.color || PALETTE[idx % PALETTE.length]}
                      strokeWidth={3}
                      dot={{ r: 4, fill: s.color || PALETTE[idx % PALETTE.length] }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              ) : isArea ? (
                <AreaChart data={rawData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                  <defs>
                    {series.map((s, idx) => {
                      const color = s.color || PALETTE[idx % PALETTE.length];
                      return (
                        <linearGradient key={s.key} id={`color-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis dataKey={xKey} stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(10, 15, 25, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  {series.map((s) => (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label || s.key}
                      stroke={s.color || PALETTE[0]}
                      fillOpacity={1}
                      fill={`url(#color-${s.key})`}
                    />
                  ))}
                </AreaChart>
              ) : isHorizontalBar ? (
                <BarChart layout="vertical" data={rawData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey={xKey} stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(10, 15, 25, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  {series.map((s, idx) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.label || s.key}
                      fill={s.color || PALETTE[idx % PALETTE.length]}
                      radius={[0, 6, 6, 0]}
                    />
                  ))}
                </BarChart>
              ) : (
                <BarChart data={rawData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                  <XAxis
                    dataKey={xKey}
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(10, 15, 25, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  {series.length > 1 && <Legend verticalAlign="top" />}
                  {series.map((s, idx) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.label || s.key}
                      fill={s.color || PALETTE[idx % PALETTE.length]}
                      radius={[6, 6, 0, 0]}
                    >
                      {series.length === 1 &&
                        rawData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={spec.colors?.[index] || PALETTE[index % PALETTE.length]}
                          />
                        ))}
                    </Bar>
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}

/** Helper function to parse chart specifications out of code blocks */
export function tryParseChart(code: string, language: string): ChartSpec | null {
  const lang = (language || "").toLowerCase().trim();
  const isChartLang = ["chart", "recharts", "json:chart", "chart:json", "graph", "plot"].includes(lang);

  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      // Check if it's text-based like:
      // Portfolio Overview
      // Public Work: 5
      // Private Work: 0
      // Total Work: 5
      const parsedFromText = parseTextChart(trimmed);
      if (parsedFromText && (isChartLang || parsedFromText.data.length >= 2)) {
        return parsedFromText;
      }
      return null;
    }

    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === "object") {
        return { type: "bar", data: parsed };
      }
      return null;
    }

    if (parsed && typeof parsed === "object") {
      // Must have data array or entries
      if (Array.isArray(parsed.data)) {
        return {
          type: parsed.type || parsed.chart_type || "bar",
          title: parsed.title,
          description: parsed.description,
          data: parsed.data,
          xKey: parsed.xKey || parsed.x_key || "name",
          series: parsed.series,
          colors: parsed.colors,
        };
      }
      // Or object with key-value pairs like {"Public Work": 5, "Private Work": 0}
      if (isChartLang || parsed.type === "bar" || parsed.chart_type) {
        const entries = Object.entries(parsed).filter(
          ([k, v]) => typeof v === "number" && !["title", "type", "description"].includes(k)
        );
        if (entries.length > 0) {
          return {
            type: (parsed.type as any) || "bar",
            title: parsed.title,
            description: parsed.description,
            data: entries.map(([name, value]) => ({ name, value })),
            xKey: "name",
          };
        }
      }
    }
  } catch {
    // If JSON parsing fails, try text chart if language was explicitly chart
    if (isChartLang) {
      return parseTextChart(code.trim());
    }
  }
  return null;
}

/** Parses key-value lines like:
 *  Public Work: 5
 *  Private Work: 0
 *  Total Work: 5
 */
function parseTextChart(text: string): ChartSpec | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const data: { name: string; value: number }[] = [];
  let title = "";

  for (const line of lines) {
    // e.g. "Portfolio Overview" without colon
    if (!line.includes(":") && !title && data.length === 0) {
      title = line;
      continue;
    }
    const match = line.match(/^([^:]+):\s*([0-9]+(?:\.[0-9]+)?)/);
    if (match) {
      const name = match[1].trim();
      const value = parseFloat(match[2]);
      if (!isNaN(value)) {
        data.push({ name, value });
      }
    }
  }

  if (data.length >= 2) {
    return {
      type: "bar",
      title: title || "Overview Chart",
      data,
      xKey: "name",
    };
  }
  return null;
}
