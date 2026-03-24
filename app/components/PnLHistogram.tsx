"use client";
import React, { useState } from "react";
import { GREEN, RED } from "@/lib/colors";

type RangeKey = "7d" | "30d" | "ytd" | "all";
type Trade = { pnl: number; time: string };

type Props = {
  trades: Trade[];
  range: RangeKey;
  className?: string;
  height?: number;
  width?: number;
  timeZone?: string;
};

export default function PnLHistogram({
  trades,
  range,
  className = "",
  height = 480,
  width = 1100,
  timeZone,
}: Props) {
  const [hi, setHi] = useState<number | null>(null);
  const hasTrades = trades && trades.length > 0;
  if (!hasTrades) return null;

  const rotateX = range === "30d";
  const isMonthly = range === "ytd" || range === "all";

  const W = width, H = height, P = 12;
  const AX = 70;
  const AY = rotateX ? 52 : 36;
  const x0 = P + AX, x1 = W - P - 8;
  const y0 = H - P - AY, y1 = P + 10;
  const plotW = x1 - x0, plotH = y0 - y1;


  const tz = timeZone || "UTC";
  const utc = (y: number, m: number, d = 1) => new Date(Date.UTC(y, m, d));
  const addDays = (d: Date, n: number) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", timeZone: tz }).format(d);
  const fmtMonth = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { month: "short", timeZone: tz }).format(d);
  const fmtUsdShort = (n: number) => {
    const s = n < 0 ? "-" : "";
    const a = Math.abs(n);
    if (a >= 1_000_000_000) return `${s}$${Math.round(a / 1_000_000_000)}B`;
    if (a >= 1_000_000) return `${s}$${Math.round(a / 1_000_000)}M`;
    if (a >= 1_000) return `${s}$${Math.round(a / 1_000)}K`;
    return `${s}$${Math.round(a)}`;
  };
  const niceStep = (range: number, approx: number) => {
    const raw = range / Math.max(1, approx);
    const p10 = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-12))));
    const n = raw / p10;
    const nice = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
    return nice * p10;
  };

  const now = new Date();
  const T = trades.map((t) => ({ ...t, d: new Date(t.time) }));

  let labels: string[] = [];
  let sums: number[] = [];

  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30;
    const end = utc(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const start = addDays(end, -days + 1);
    const idx = (d: Date) =>
      Math.floor(
        (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - +start) / 86400000
      );
    sums = Array(days).fill(0);
    T.forEach((t) => {
      const i = idx(t.d);
      if (i >= 0 && i < days) sums[i] += t.pnl;
    });
    labels = Array.from({ length: days }, (_, i) => fmtDate(addDays(start, i)));
  } else {
    const end = utc(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const months = range === "ytd" ? now.getUTCMonth() + 1 : 12;
    const start = utc(end.getUTCFullYear(), end.getUTCMonth() - (months - 1), 1);
    const idx = (d: Date) =>
      (d.getUTCFullYear() - start.getUTCFullYear()) * 12 + (d.getUTCMonth() - start.getUTCMonth());
    sums = Array(months).fill(0);
    T.forEach((t) => {
      const i = idx(t.d);
      if (i >= 0 && i < months) sums[i] += t.pnl;
    });
    labels = Array.from({ length: months }, (_, i) =>
      fmtMonth(utc(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
    );
  }

  let minY = Math.min(0, ...sums);
  let maxY = Math.max(0, ...sums);
  const absMax = Math.max(Math.abs(minY), Math.abs(maxY));
  const padAbs = Math.max(absMax * 0.12, 10);
  minY -= padAbs;
  maxY += padAbs;

  const sx = (i: number) => x0 + (i + 0.5) * (plotW / Math.max(1, sums.length));
  const sy = (v: number) => y0 - ((v - minY) / (maxY - minY || 1)) * plotH;
  const zeroY = sy(0);

  const yTicks = (() => {
    const step = niceStep(maxY - minY || 1, 5);
    const start = Math.ceil(minY / step) * step;
    const arr: number[] = [];
    for (let v = start; v <= maxY + 1e-9; v += step) arr.push(+v.toFixed(12));
    return arr;
  })();

  const barW = Math.max(8, (plotW / Math.max(1, sums.length)) * 0.55);

  const gridColor = "rgba(255,255,255,0.08)";
  const zeroColor = "rgba(255,255,255,0.18)";
  const textColor = "rgba(255,255,255,0.75)";
  const tipBg = "rgba(0,0,0,0.75)";

  return (
    <div className={`glass p-4 ${className}`}>
      <div className="mb-2 text-sm text-zinc-400">P&amp;L</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={gridColor} strokeWidth="1" />
        {yTicks.map((t, i) => (
          <line key={`gy-${i}`} x1={x0} x2={x1} y1={sy(t)} y2={sy(t)} stroke={gridColor} />
        ))}
        <line x1={x0} y1={zeroY} x2={x1} y2={zeroY} stroke={zeroColor} strokeWidth="1.25" />
        <line x1={x0} y1={y0} x2={x0} y2={y1} stroke={gridColor} />

        {yTicks.map((t, i) => (
          <g key={`yt-${i}`}>
            <line x1={x0 - 6} x2={x0} y1={sy(t)} y2={sy(t)} stroke={gridColor} />
            <text x={x0 - 10} y={sy(t) + 4} fontSize="20" textAnchor="end" fill={textColor}>
              {fmtUsdShort(t)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {(() => {
          const n = labels.length;
          const baseStep = isMonthly ? 1 : n <= 12 ? 1 : Math.ceil(n / 8);
          let lastX = -Infinity;
          const els: React.ReactElement[] = [];
          for (let i = 0; i < n; i++) {
            if (i % baseStep !== 0 && i !== n - 1) continue;
            const x = sx(i);
            if (!isMonthly && x - lastX < 70) continue;
            lastX = x;
            els.push(
              <text
                key={`xl-${i}`}
                x={x}
                y={y0 + (rotateX ? 28 : 22)}
                fontSize="20"
                textAnchor="middle"
                fill={textColor}
                transform={rotateX ? `rotate(-20 ${x} ${y0 + 22})` : undefined}
              >
                {labels[i]}
              </text>
            );
          }
          return els;
        })()}

        {/* Bars */}
        {sums.map((v, i) => {
          const cx = sx(i);
          const isPos = v >= 0;
          const yTop = isPos ? sy(v) : zeroY;
          const h = Math.max(3, Math.abs(sy(v) - zeroY));
          const color = isPos ? GREEN : RED;

          return (
            <rect
              key={i}
              x={cx - barW / 2}
              y={yTop}
              width={barW}
              height={h}
              rx="3"
              fill={color}
              opacity={hi === i ? 1 : 0.92}
              onMouseEnter={() => setHi(i)}
              onMouseLeave={() => setHi(null)}
            />
          );
        })}

        {/* Tooltip */}
        {hi !== null && (() => {
          const v = sums[hi];
          const cx = sx(hi);
          const isPos = v >= 0;
          const yTop = isPos ? sy(v) : zeroY;
          const label = fmtUsdShort(v);
          const padX = 8;
          const charW = 9;
          const w = Math.max(44, label.length * charW + padX * 2);
          const h = 26;
          const tipX = Math.min(Math.max(cx - w / 2, x0), x1 - w);
          const tipY = Math.max(yTop - h - 10, y1 + 4);

          return (
            <g pointerEvents="none">
              <rect x={tipX} y={tipY} width={w} height={h} rx="6" fill={tipBg} />
              <text
                x={tipX + w / 2}
                y={tipY + h / 2 + 5}
                fontSize="20"
                textAnchor="middle"
                fill="#fff"
              >
                {label}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
