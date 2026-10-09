"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveLine } from "@nivo/line";
import {
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Table2,
  Check,
  Copy,
  Maximize2,
  Minimize2,
  Palette,
  Sparkles,
} from "lucide-react";

export interface ChartSpec {
  type?: "bar" | "horizontal_bar" | "barh" | "line" | "area" | "pie" | "donut" | string;
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
  scheme?: string;
  size?: "half" | "full" | "third" | "two-thirds" | "quarter" | "sm" | "md" | "lg" | string;
  colSpan?: number;
  height?: number;
}

const PALETTES: Record<string, string[]> = {
  cyber: ["#38bdf8", "#818cf8", "#c084fc", "#34d399", "#fbbf24", "#f43f5e"],
  emerald: ["#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"],
  neon: ["#a855f7", "#ec4899", "#f43f5e", "#fb923c", "#facc15", "#4ade80"],
  amber: ["#f59e0b", "#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6"],
  nivo: ["#e8c1a0", "#f47560", "#f1e15b", "#e8a838", "#61cdbb", "#97e3d5"],
};

const nivoDarkTheme = {
  background: "transparent",
  text: {
    fontSize: 11,
    fill: "#94a3b8",
    outlineWidth: 0,
    outlineColor: "transparent",
  },
  axis: {
    domain: {
      line: {
        stroke: "rgba(255, 255, 255, 0.12)",
        strokeWidth: 1,
      },
    },
    legend: {
      text: {
        fontSize: 11,
        fill: "#cbd5e1",
        fontWeight: 600,
      },
    },
    ticks: {
      line: {
        stroke: "rgba(255, 255, 255, 0.15)",
        strokeWidth: 1,
      },
      text: {
        fontSize: 11,
        fill: "#94a3b8",
      },
    },
  },
  grid: {
    line: {
      stroke: "rgba(255, 255, 255, 0.06)",
      strokeWidth: 1,
      strokeDasharray: "3 3",
    },
  },
  legends: {
    text: {
      fontSize: 11,
      fill: "#e2e8f0",
      fontWeight: 500,
    },
  },
  tooltip: {
    container: {
      background: "#090d16",
      color: "#f8fafc",
      fontSize: 12,
      borderRadius: 10,
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.15)",
      padding: "8px 12px",
    },
  },
};

/**
 * Individual Chart Card.
 * Enclosed in an independent card / div with rich glassmorphism, responsive controls, and Nivo SVG rendering.
 */
export function AiChart({
  spec,
  tall = false,
  cardSize,
  onToggleSize,
}: {
  spec: ChartSpec;
  tall?: boolean;
  cardSize?: "half" | "full" | "third" | string;
  onToggleSize?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [copied, setCopied] = useState(false);
  const [currentType, setCurrentType] = useState<string>(spec.type || "bar");
  const [isExpanded, setIsExpanded] = useState(false);
  const [paletteKey, setPaletteKey] = useState<keyof typeof PALETTES>("cyber");

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeColors = useMemo(() => {
    if (spec.colors && spec.colors.length > 0) return spec.colors;
    return PALETTES[paletteKey] || PALETTES.cyber;
  }, [spec.colors, paletteKey]);

  if (!spec || !Array.isArray(spec.data) || spec.data.length === 0) {
    return null;
  }

  const rawData = spec.data;
  const xKey = spec.xKey || "name";

  // Determine series keys
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
        color: activeColors[i % activeColors.length],
      }));
    } else {
      series = [{ key: "value", label: "Value", color: activeColors[0] }];
    }
  }

  const seriesKeys = series.map((s) => s.key);

  // Prepare Nivo Pie Data
  const pieData = useMemo(() => {
    const targetKey = series[0]?.key || "value";
    return rawData.map((row, idx) => ({
      id: String(row[xKey] ?? `Item ${idx + 1}`),
      label: String(row[xKey] ?? `Item ${idx + 1}`),
      value: Number(row[targetKey] ?? 0),
      color: activeColors[idx % activeColors.length],
    }));
  }, [rawData, xKey, series, activeColors]);

  // Prepare Nivo Line Data
  const lineData = useMemo(() => {
    return series.map((s, sIdx) => ({
      id: s.label || s.key,
      color: s.color || activeColors[sIdx % activeColors.length],
      data: rawData.map((row) => ({
        x: String(row[xKey] ?? ""),
        y: Number(row[s.key] ?? 0),
      })),
    }));
  }, [series, rawData, xKey, activeColors]);

  // Prepare Nivo Bar Data
  const barData = useMemo(() => {
    return rawData.map((row) => {
      const entry: Record<string, any> = { ...row };
      entry[xKey] = String(row[xKey] ?? "");
      series.forEach((s) => {
        entry[s.key] = Number(row[s.key] ?? 0);
      });
      return entry;
    });
  }, [rawData, xKey, series]);

  const copyData = () => {
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHorizontalBar = currentType === "horizontal_bar" || currentType === "barh";
  const isLine = currentType === "line" || currentType === "area";
  const isPie = currentType === "pie" || currentType === "donut";
  const isDonut = currentType === "donut";

  const effectiveCardSize = cardSize || spec.size;
  // Height calculations based on card size
  const isCompactSize = effectiveCardSize === "half" || effectiveCardSize === "third" || effectiveCardSize === "sm";
  const defaultHeight = isCompactSize ? 340 : tall ? 480 : 410;
  const chartHeight = isExpanded ? 580 : (spec.height || defaultHeight);

  return (
    <div
      className={`group relative flex flex-col justify-between w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-sky-500/20 dark:border-sky-500/30 bg-gradient-to-b from-sky-950/25 via-zinc-950/90 to-black/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-sky-500/40 hover:shadow-sky-500/5 ${
        isExpanded ? "ring-2 ring-sky-500/50" : ""
      }`}
    >
      {/* Ambient Radial Lighting & Textures (Subtle Noise) */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl transition-opacity group-hover:opacity-100" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl transition-opacity group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(56,189,248,0.12)_1px,transparent_1px)] [background-size:20px_20px] opacity-25 mix-blend-screen" />

      {/* Top Card Header */}
      <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 pb-3">
        <div className="min-w-0 flex-1">
          {spec.title && (
            <h4 className="flex items-center gap-2 text-sm sm:text-base font-semibold tracking-tight text-white">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                {isPie ? (
                  <PieIcon className="h-3.5 w-3.5" />
                ) : isLine ? (
                  <LineIcon className="h-3.5 w-3.5" />
                ) : (
                  <BarChart3 className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="truncate">{spec.title}</span>
              <span className="ml-1 rounded-full border border-sky-400/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-mono text-sky-300">
                Nivo
              </span>
              {effectiveCardSize && (
                <button
                  type="button"
                  onClick={onToggleSize}
                  disabled={!onToggleSize}
                  className={`hidden sm:inline-flex items-center gap-1 rounded-full border border-zinc-700/80 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition ${
                    onToggleSize ? "hover:border-sky-400/50 hover:bg-sky-500/15 hover:text-white cursor-pointer" : ""
                  }`}
                  title={onToggleSize ? "Click to toggle card width (Compact / Full)" : undefined}
                >
                  <span className="capitalize">
                    {effectiveCardSize === "half"
                      ? "Half Card (1/2)"
                      : effectiveCardSize === "third"
                      ? "1/3 Card"
                      : "Full Card"}
                  </span>
                </button>
              )}
            </h4>
          )}
          {spec.description && (
            <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{spec.description}</p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Chart Types */}
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => setCurrentType("bar")}
              className={`rounded px-1.5 py-1 transition ${
                currentType === "bar"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Vertical Bar Chart"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentType("horizontal_bar")}
              className={`rounded px-1.5 py-1 transition ${
                currentType === "horizontal_bar"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Horizontal Bar Chart"
            >
              <BarChart3 className="h-3.5 w-3.5 rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentType("line")}
              className={`rounded px-1.5 py-1 transition ${
                currentType === "line"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Line Chart"
            >
              <LineIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentType("pie")}
              className={`rounded px-1.5 py-1 transition ${
                currentType === "pie"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Pie / Donut Chart"
            >
              <PieIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Palette toggle */}
          <button
            type="button"
            onClick={() => {
              const keys = Object.keys(PALETTES) as (keyof typeof PALETTES)[];
              const nextIdx = (keys.indexOf(paletteKey) + 1) % keys.length;
              setPaletteKey(keys[nextIdx]);
            }}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10 transition"
            title={`Palette: ${paletteKey}`}
          >
            <Palette className="h-3.5 w-3.5 text-zinc-400" />
            <span className="capitalize hidden xl:inline">{paletteKey}</span>
          </button>

          {/* Table / Chart Toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "chart" ? "table" : "chart")}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10 transition"
          >
            <Table2 className="h-3.5 w-3.5 text-zinc-400" />
            <span className="hidden sm:inline">{viewMode === "chart" ? "Table" : "Chart"}</span>
          </button>

          {/* Expand / Wide Screen Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 transition ${
              isExpanded
                ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
                : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
            title={isExpanded ? "Compact view" : "Full height expansion"}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5 text-sky-400" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </button>

          {/* Copy Spec */}
          <button
            type="button"
            onClick={copyData}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10 transition"
            title="Copy Raw Spec"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Main Card Canvas */}
      {viewMode === "table" ? (
        <div className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-2">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400">
                <th className="py-2 px-3 font-semibold uppercase">{xKey}</th>
                {series.map((s) => (
                  <th key={s.key} className="py-2 px-3 font-semibold uppercase text-right">
                    {s.label || s.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawData.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 px-3 font-medium text-white">{String(row[xKey] ?? "")}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-2 px-3 text-right font-mono text-sky-400">
                      {row[s.key] !== undefined ? String(row[s.key]) : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{ height: chartHeight, width: "100%" }}
          className="relative flex-1 w-full max-w-full overflow-hidden rounded-xl pt-2"
        >
          {!mounted ? (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              Loading Nivo visualization engine…
            </div>
          ) : isPie ? (
            <ResponsivePie
              data={pieData}
              theme={nivoDarkTheme}
              colors={activeColors}
              margin={{ top: 25, right: 60, bottom: 50, left: 60 }}
              innerRadius={isDonut ? 0.55 : 0.05}
              padAngle={1.8}
              cornerRadius={5}
              activeOuterRadiusOffset={8}
              borderWidth={1}
              borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
              arcLinkLabelsSkipAngle={8}
              arcLinkLabelsTextColor="#cbd5e1"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: "color" }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor="#ffffff"
              legends={[
                {
                  anchor: "bottom",
                  direction: "row",
                  justify: false,
                  translateX: 0,
                  translateY: 45,
                  itemsSpacing: 6,
                  itemWidth: 80,
                  itemHeight: 16,
                  itemTextColor: "#94a3b8",
                  itemDirection: "left-to-right",
                  itemOpacity: 0.9,
                  symbolSize: 10,
                  symbolShape: "circle",
                },
              ]}
            />
          ) : isLine ? (
            <ResponsiveLine
              data={lineData}
              theme={nivoDarkTheme}
              colors={activeColors}
              margin={{ top: 25, right: 90, bottom: 45, left: 50 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: "auto", max: "auto", stacked: false, reverse: false }}
              curve="monotoneX"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: xKey,
                legendOffset: 34,
                legendPosition: "middle",
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: series[0]?.label || "Value",
                legendOffset: -40,
                legendPosition: "middle",
              }}
              pointSize={8}
              pointColor={{ theme: "background" }}
              pointBorderWidth={2}
              pointBorderColor={{ from: "serieColor" }}
              pointLabelYOffset={-12}
              enableArea={currentType === "area"}
              areaOpacity={0.25}
              useMesh={true}
              legends={[
                {
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 80,
                  translateY: 0,
                  itemsSpacing: 4,
                  itemDirection: "left-to-right",
                  itemWidth: 75,
                  itemHeight: 18,
                  itemOpacity: 0.85,
                  symbolSize: 10,
                  symbolShape: "circle",
                },
              ]}
            />
          ) : (
            <ResponsiveBar
              data={barData}
              keys={seriesKeys}
              indexBy={xKey}
              theme={nivoDarkTheme}
              colors={activeColors}
              margin={{
                top: 25,
                right: seriesKeys.length > 1 ? 110 : 25,
                bottom: 45,
                left: isHorizontalBar ? 80 : 50,
              }}
              padding={0.32}
              layout={isHorizontalBar ? "horizontal" : "vertical"}
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              borderRadius={4}
              borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: isHorizontalBar ? 0 : rawData.length > 5 ? -25 : 0,
                legend: isHorizontalBar ? (series[0]?.label || "Value") : xKey,
                legendPosition: "middle",
                legendOffset: 38,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: isHorizontalBar ? xKey : (series[0]?.label || "Value"),
                legendPosition: "middle",
                legendOffset: isHorizontalBar ? -70 : -40,
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#ffffff"
              legends={
                seriesKeys.length > 1
                  ? [
                      {
                        dataFrom: "keys",
                        anchor: "bottom-right",
                        direction: "column",
                        justify: false,
                        translateX: 100,
                        translateY: 0,
                        itemsSpacing: 4,
                        itemWidth: 80,
                        itemHeight: 18,
                        itemDirection: "left-to-right",
                        itemOpacity: 0.85,
                        symbolSize: 11,
                      },
                    ]
                  : []
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Responsive Multi-Card Grid.
 * Displays 2, 3, 4, 5+ chart cards in a unified responsive dashboard.
 * Each chart sits in its own card/div according to its suggested or configured size.
 */
export function ChartGrid({ charts }: { charts: ChartSpec[] }) {
  const [sizeOverrides, setSizeOverrides] = useState<Record<number, string>>({});

  if (!charts || charts.length === 0) return null;

  if (charts.length === 1) {
    return <AiChart spec={charts[0]} />;
  }

  const toggleSize = (idx: number, currentSuggested?: string) => {
    setSizeOverrides((prev) => {
      const cur = prev[idx] || currentSuggested || "half";
      const next = cur === "full" ? "half" : "full";
      return { ...prev, [idx]: next };
    });
  };

  return (
    <div className="my-4 grid w-full max-w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 items-stretch">
      {charts.map((spec, idx) => {
        const effectiveSize = sizeOverrides[idx] || spec.size;
        let span = "col-span-1 md:col-span-2 lg:col-span-12";

        if (effectiveSize === "full" || spec.colSpan === 3 || spec.colSpan === 12) {
          span = "col-span-1 md:col-span-2 lg:col-span-12";
        } else if (effectiveSize === "third" || spec.colSpan === 1 || spec.colSpan === 4) {
          span = "col-span-1 md:col-span-1 lg:col-span-4";
        } else if (effectiveSize === "two-thirds" || spec.colSpan === 8) {
          span = "col-span-1 md:col-span-2 lg:col-span-8";
        } else if (effectiveSize === "half" || spec.colSpan === 2 || spec.colSpan === 6) {
          span = "col-span-1 md:col-span-1 lg:col-span-6";
        } else {
          // Automatic intelligent distribution based on total count
          if (charts.length === 2) {
            span = "col-span-1 md:col-span-1 lg:col-span-6";
          } else if (charts.length === 3) {
            // First 2 are half width (Row 1), 3rd is full width underneath (Row 2)
            span = idx < 2 ? "col-span-1 md:col-span-1 lg:col-span-6" : "col-span-1 md:col-span-2 lg:col-span-12";
          } else if (charts.length === 4) {
            span = "col-span-1 md:col-span-1 lg:col-span-6";
          } else if (charts.length === 5) {
            // 5 charts: First 2 are half width (Row 1), next 3 are 1/3 width (Row 2)!
            span = idx < 2 ? "col-span-1 md:col-span-1 lg:col-span-6" : "col-span-1 md:col-span-1 lg:col-span-4";
          } else {
            span = "col-span-1 md:col-span-1 lg:col-span-6";
          }
        }

        return (
          <div key={idx} className={`${span} flex flex-col w-full min-w-0 transition-all duration-300`}>
            <AiChart
              spec={spec}
              cardSize={effectiveSize}
              onToggleSize={() => toggleSize(idx, effectiveSize)}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Normalizes raw chart object attributes into a typed ChartSpec */
function normalizeChartItem(item: any): ChartSpec | null {
  if (!item || typeof item !== "object") return null;

  let data = item.data;
  // If data is an object dictionary: {"Public": 5, "Private": 2} -> convert to array
  if (data && typeof data === "object" && !Array.isArray(data)) {
    data = Object.entries(data).map(([name, value]) => ({
      name,
      value: typeof value === "number" ? value : Number(value) || 0,
    }));
  }

  if (!Array.isArray(data) || data.length === 0) {
    // Check if item itself has key-value pairs representing data
    const entries = Object.entries(item).filter(
      ([k, v]) =>
        typeof v === "number" &&
        !["title", "type", "description", "size", "layout", "height", "colSpan", "col_span", "xKey", "x_key"].includes(k)
    );
    if (entries.length >= 2) {
      data = entries.map(([name, value]) => ({ name, value }));
    } else {
      return null;
    }
  }

  const rawSize = item.size || item.width || item.layout_size;
  let normalizedSize: ChartSpec["size"] = undefined;
  if (rawSize) {
    const s = String(rawSize).toLowerCase().trim();
    if (s.includes("half") || s === "1/2" || s === "50%") normalizedSize = "half";
    else if (s.includes("third") || s === "1/3" || s === "33%") normalizedSize = "third";
    else if (s.includes("two-third") || s === "2/3" || s === "66%") normalizedSize = "two-thirds" as any;
    else if (s.includes("full") || s === "1/1" || s === "100%") normalizedSize = "full";
    else normalizedSize = s as any;
  }

  return {
    type: item.type || item.chart_type || item.kind || "bar",
    title: item.title,
    description: item.description,
    data,
    xKey: item.xKey || item.x_key || "name",
    series: item.series,
    colors: item.colors,
    scheme: item.scheme,
    size: normalizedSize,
    colSpan: item.colSpan || item.col_span,
    height: item.height,
  };
}

/** Parses one or multiple chart specifications out of a code block */
export function tryParseCharts(code: string, language: string): ChartSpec[] | null {
  const lang = (language || "").toLowerCase().trim();
  const isChartLang = ["chart", "nivo", "recharts", "json:chart", "chart:json", "graph", "plot"].includes(lang);

  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      const parsedFromText = parseTextChart(trimmed);
      if (parsedFromText && (isChartLang || parsedFromText.data.length >= 2)) {
        return [parsedFromText];
      }
      return null;
    }

    const parsed = JSON.parse(trimmed);

    // Case 1: Object with a "charts" array: { layout: "grid", charts: [ ... ] }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.charts)) {
      const results: ChartSpec[] = [];
      for (const item of parsed.charts) {
        const normalized = normalizeChartItem(item);
        if (normalized) results.push(normalized);
      }
      if (results.length > 0) return results;
    }

    // Case 2: Array of items: could be an array of ChartSpecs or an array of data rows
    if (Array.isArray(parsed)) {
      if (parsed.length > 0) {
        // Check if elements are chart specs (have data array or type or title)
        const isArrayOfCharts = parsed.every(
          (p) => p && typeof p === "object" && (Array.isArray(p.data) || p.type || p.chart_type || (p.data && typeof p.data === "object"))
        );
        if (isArrayOfCharts) {
          const results: ChartSpec[] = [];
          for (const item of parsed) {
            const normalized = normalizeChartItem(item);
            if (normalized) results.push(normalized);
          }
          if (results.length > 0) return results;
        }

        // Otherwise, it is an array of data rows for a single bar chart
        if (typeof parsed[0] === "object") {
          return [{ type: "bar", data: parsed }];
        }
      }
      return null;
    }

    // Case 3: Object with nested chart maps: e.g. { chart1: { ... }, chart2: { ... } }
    if (parsed && typeof parsed === "object") {
      const subValues = Object.values(parsed);
      const isMapOfCharts =
        subValues.length > 1 &&
        subValues.every((v) => v && typeof v === "object" && (Array.isArray((v as any).data) || (v as any).type));
      if (isMapOfCharts) {
        const results: ChartSpec[] = [];
        for (const item of subValues) {
          const normalized = normalizeChartItem(item);
          if (normalized) results.push(normalized);
        }
        if (results.length > 0) return results;
      }

      // Case 4: Single chart object
      const single = normalizeChartItem(parsed);
      if (single) return [single];
    }
  } catch {
    if (isChartLang) {
      const parsedText = parseTextChart(code.trim());
      if (parsedText) return [parsedText];
    }
  }
  return null;
}

/** Legacy helper: returns single chart or first of group */
export function tryParseChart(code: string, language: string): ChartSpec | null {
  const list = tryParseCharts(code, language);
  return list && list.length > 0 ? list[0] : null;
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
