"use client";

import { useMemo, useState } from "react";

type Pt = { x: number; y: number };

type Props = {
  data: Pt[];
  className?: string;
  showAxes?: boolean;
  showGrid?: boolean;
  yTicks?: number;
  xTicks?: number;
  xLabel?: string;
  yLabel?: string;
  showTooltip?: boolean;
  timeZone?: string;
};

export default function SparklineInteractive({
  data,
  className = "",
  showAxes = false,
  showGrid = false,
  yTicks = 4,
  xTicks = 3,
  xLabel,
  yLabel,
  showTooltip = true,
  timeZone,
}: Props) {
  // Hooks must be called unconditionally
  const [hi, setHi] = useState<number | null>(null);

  const series = useMemo(() => {
    if (!data?.length) return [] as Pt[];
    const s = [...data]
      .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y))
      .sort((a, b) => a.x - b.x);
    // de-duplicate by x
    return s.filter((d, i) => (i === 0 ? true : d.x !== s[i - 1].x));
  }, [data]);

  const hasData = series.length > 0;
  if (!hasData) return null;

  // ---- scales & geometry
  const xs = series.map((d) => d.x);
  const ys = series.map((d) => d.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const W = 900;
  const H = 320;
  const P = 12;
  const AX = showAxes ? 64 : 0;
  const AY = showAxes ? (xLabel ? 34 : 18) : 0;

  const plotX0 = P + AX;
  const plotX1 = W - P - (showAxes ? 8 : 0);
  const plotY0 = H - P - AY;
  const plotY1 = P + (showAxes ? 6 : 0);
  const plotW = plotX1 - plotX0;
  const plotH = plotY0 - plotY1;

  const sx = (x: number) =>
    plotX0 + ((x - minX) / (maxX - minX || 1)) * plotW;
  const sy = (y: number) =>
    plotY0 - ((y - minY) / (maxY - minY || 1)) * plotH;

  const path = series
    .map((p, i) => `${i ? "L" : "M"}${sx(p.x)},${sy(p.y)}`)
    .join(" ");
  const xsScaled = series.map((p) => sx(p.x));

  // ---- formatters
  const tz = timeZone || "UTC";
  const fmtDate = (ts: number) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      timeZone: tz,
    }).format(new Date(ts));

  const fmtUsdFull = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(n);

  const fmtUsdCompact = (n: number) => {
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    let value = abs;
    let suffix = "";

    if (abs >= 1_000_000_000) {
      value = abs / 1_000_000_000;
      suffix = "B";
    } else if (abs >= 1_000_000) {
      value = abs / 1_000_000;
      suffix = "M";
    } else if (abs >= 1_000) {
      value = abs / 1_000;
      suffix = "K";
    } else {
      return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
    }

    const rounded =
      abs >= 100_000 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${sign}$${rounded}${suffix}`;
  };

  // ---- ticks
  const niceStep = (range: number, approx: number) => {
    const raw = range / Math.max(1, approx);
    const pow10 = Math.pow(
      10,
      Math.floor(Math.log10(Math.max(raw, 1e-12)))
    );
    const n = raw / pow10;
    const nice = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
    return nice * pow10;
  };

  const buildTicks = (min: number, max: number, approx: number) => {
    if (min === max) return [min];
    const step = niceStep(max - min, approx);
    const start = Math.ceil(min / step) * step;
    const tickVals: number[] = [];
    for (let v = start; v <= max + 1e-9; v += step) {
      tickVals.push(+v.toFixed(12));
    }
    return tickVals;
  };

  const yTickVals = showAxes ? buildTicks(minY, maxY, yTicks) : [];
  const xTickIdxs = showAxes
    ? xLabel
      ? [0, series.length - 1]
      : Array.from(
          { length: Math.min(xTicks, series.length) },
          (_, i) =>
            Math.round(
              (i * (series.length - 1)) / Math.max(1, xTicks - 1)
            )
        )
    : [];

  // ---- helpers
  const textColor = "rgba(255,255,255,0.7)";
  const gridColor = "rgba(255,255,255,0.08)";
  const CORNER_GAP = 34;

  const nearestIndex = (xSvg: number) => {
    let idx = 0;
    let best = Infinity;
    xsScaled.forEach((xx, i) => {
      const d = Math.abs(xx - xSvg);
      if (d < best) {
        best = d;
        idx = i;
      }
    });
    return idx;
  };

  const tooltipLeftPx = (idx: number) => {
    const pad = 120;
    const raw = xsScaled[Math.min(Math.max(idx, 0), xsScaled.length - 1)];
    return Math.max(plotX0 + 8, Math.min(raw + 6, W - pad));
  };

  const hiValid = hi !== null && hi >= 0 && hi < series.length;

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* baseline */}
        <line
          x1={plotX0}
          y1={plotY0}
          x2={plotX1}
          y2={plotY0}
          stroke={gridColor}
          strokeWidth="1"
        />

        {/* grid */}
        {showGrid &&
          yTickVals.map((v, i) => (
            <line
              key={`gy-${i}`}
              x1={plotX0}
              x2={plotX1}
              y1={sy(v)}
              y2={sy(v)}
              stroke={gridColor}
            />
          ))}

        {/* axes & ticks */}
        {showAxes && (
          <>
            <line
              x1={plotX0}
              y1={plotY0}
              x2={plotX0}
              y2={plotY1}
              stroke={gridColor}
            />
            {yTickVals.map((v, i) => (
              <g key={`yt-${i}`}>
                <line
                  x1={plotX0 - 6}
                  x2={plotX0}
                  y1={sy(v)}
                  y2={sy(v)}
                  stroke={gridColor}
                />
                <text
                  x={plotX0 - 10}
                  y={sy(v) + 3}
                  fontSize="11"
                  textAnchor="end"
                  fill={textColor}
                >
                  {fmtUsdCompact(v)}
                </text>
              </g>
            ))}

            {xTickIdxs.map((idx, i) => {
              const s = series[idx];
              const xx = sx(s.x);
              if (
                xx < plotX0 + CORNER_GAP ||
                xx > plotX1 - CORNER_GAP
              )
                return null;
              return (
                <g key={`xt-${i}`}>
                  <line
                    x1={xx}
                    x2={xx}
                    y1={plotY0}
                    y2={plotY0 + 6}
                    stroke={gridColor}
                  />
                  <text
                    x={xx}
                    y={plotY0 + 16}
                    fontSize="11"
                    textAnchor="middle"
                    fill={textColor}
                  >
                    {fmtDate(s.x)}
                  </text>
                </g>
              );
            })}

            {yLabel && (
              <text
                x={plotX0 - 44}
                y={(plotY0 + plotY1) / 2}
                fontSize="12"
                fill={textColor}
                textAnchor="middle"
                transform={`rotate(-90, ${
                  plotX0 - 44
                }, ${(plotY0 + plotY1) / 2})`}
              >
                {yLabel}
              </text>
            )}
            {xLabel && (
              <text
                x={(plotX0 + plotX1) / 2}
                y={plotY0 + 30}
                fontSize="12"
                fill={textColor}
                textAnchor="middle"
              >
                {xLabel}
              </text>
            )}
          </>
        )}

        {/* series */}
        <path
          d={path}
          fill="none"
          stroke="#34d399"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={`${path} L ${sx(
            series[series.length - 1].x
          )},${plotY0} L ${sx(series[0].x)},${plotY0} Z`}
          fill="url(#equityFill)"
        />

        {/* hover marker */}
        {hiValid && (
          <>
            <line
              x1={sx(series[hi!].x)}
              x2={sx(series[hi!].x)}
              y1={plotY1}
              y2={plotY0}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="3 3"
            />
            <circle
              cx={sx(series[hi!].x)}
              cy={sy(series[hi!].y)}
              r="4"
              fill="#34d399"
            />
          </>
        )}

        {/* hover capture */}
        <rect
          x={plotX0}
          y={plotY1}
          width={plotW}
          height={plotH}
          fill="transparent"
          onMouseMove={(e) => {
            const svg = e.currentTarget.ownerSVGElement;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const xSvg =
              ((e.clientX - rect.left) * W) / rect.width;
            setHi(nearestIndex(xSvg));
          }}
          onMouseLeave={() => setHi(null)}
        />
      </svg>

      {/* tooltip */}
      {showTooltip && hiValid && (
        <div
          className="pointer-events-none absolute rounded-md border border-white/10 bg-black/70 px-2 py-1 text-xs text-zinc-100"
          style={{ left: tooltipLeftPx(hi!), top: 6 }}
        >
          <div>{fmtDate(series[hi!].x)}</div>
          <div className="font-medium">
            {fmtUsdFull(series[hi!].y)}
          </div>
        </div>
      )}
    </div>
  );
}
