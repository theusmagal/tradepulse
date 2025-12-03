"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import KPI from "@/components/KPI";
import CalendarPreview from "@/components/CalendarPreview";
import SparklineInteractive from "@/components/SparklineInteractive";
import TradesTable from "@/components/TradesTable";
import PnLHistogram from "@/components/PnLHistogram";
import TopSymbols from "@/components/TopSymbols";
import { fmtUsd } from "@/lib/format";

import GaugeWinRate from "@/components/widgets/GaugeWinRate";
import DonutProfitSplit from "@/components/widgets/DonutProfitSplit";
import AvgWinLossBar from "@/components/widgets/AvgWinLossBar";
import { Activity } from "lucide-react";

const MOTIVATION_POSITIVE = [
  "Best losers win.",
  "Good things take time.",
  "Small edges, big outcomes.",
  "Process over outcome.",
  "Stick to the plan.",
  "Protect the downside.",
  "Let winners work.",
  "One trade at a time.",
  "Patience is a position.",
  "Discipline compounds.",
];

const MOTIVATION_TOUGH = [
  "Losses are tuition. Learn fast.",
  "Red days teach green habits.",
  "Review, adjust, execute.",
  "Cut quick, live to trade.",
  "Great risk = great respect.",
  "You only need the next good trade.",
];

type Summary = {
  kpis: {
    netPnl: number;
    winRate: number;
    profitFactor: number;
    avgR: number;
    tradeCount: number;
  };
  equity: { x: number; y: number }[];
  calendar: { day: number; pnl: number; trades: number }[];
  trades: {
    id: string;
    symbol: string;
    side: "BUY" | "SELL";
    qty: string;
    price: string;
    pnl: number;
    time: string;
  }[];
};
type RangeKey = "7d" | "30d" | "ytd" | "all";

export default function DashboardClient({
  initial,
  initialRange,
}: {
  initial: Summary;
  initialRange: RangeKey;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRange = (searchParams.get("range") as RangeKey) || initialRange;

  const [range, setRange] = useState<RangeKey>(urlRange);
  const [data, setData] = useState<Summary>(initial);
  const [loading, setLoading] = useState(false);

  const tz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getUTCFullYear());
  const [calMonth, setCalMonth] = useState(now.getUTCMonth()); // 0..11

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(calYear, calMonth + delta, 1));
    setCalYear(d.getUTCFullYear());
    setCalMonth(d.getUTCMonth());
  };

  useEffect(() => {
    if (urlRange !== range) setRange(urlRange);
  }, [urlRange, range]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/me/summary?range=${range}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json: Summary) => {
        if (!active) return;
        setData((prev) => ({
          ...prev,
          ...json,
          calendar: prev.calendar,
        }));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range]);

  useEffect(() => {
    let active = true;
    const ym = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
    fetch(`/api/me/summary?ym=${ym}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json: Pick<Summary, "calendar">) => {
        if (!active) return;
        setData((prev) => ({ ...prev, calendar: json.calendar }));
      });
    return () => {
      active = false;
    };
  }, [calYear, calMonth]);

  const stats = useMemo(() => {
    const wins = data.trades.filter((t) => t.pnl > 0);
    const losses = data.trades.filter((t) => t.pnl < 0);

    const grossWins = wins.reduce((a, t) => a + t.pnl, 0);
    const grossLossesAbs = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));

    const avgWin = wins.length ? grossWins / wins.length : 0;
    const avgLossAbs = losses.length ? grossLossesAbs / losses.length : 0;

    const profitFactor =
      grossLossesAbs > 0 ? grossWins / grossLossesAbs : wins.length ? Infinity : 0;

    return {
      wins: wins.length,
      losses: losses.length,
      grossWins,
      grossLossesAbs,
      avgWin,
      avgLossAbs,
      profitFactor,
    };
  }, [data]);

  const setRangeAndUrl = (r: RangeKey) => {
    setRange(r);
    const q = new URLSearchParams(searchParams);
    q.set("range", r);
    router.replace(`?${q.toString()}`, { scroll: false });
  };

  const phraseOfDay = useMemo(() => {
    const millisPerDay = 24 * 60 * 60 * 1000;
    const dayIndex = Math.floor(Date.now() / millisPerDay);
    const source =
      data.kpis.netPnl >= 0 ? MOTIVATION_POSITIVE : MOTIVATION_TOUGH;
    return source[dayIndex % source.length];
  }, [data.kpis.netPnl]);

  const prettyRange = useMemo(() => {
    switch (range) {
      case "7d":
        return "last 7 days";
      case "30d":
        return "last 30 days";
      case "ytd":
        return "year to date";
      default:
        return "all time";
    }
  }, [range]);

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center gap-2">
        {(["7d", "30d", "ytd", "all"] as RangeKey[]).map((r) => {
          const active = range === r;
          return (
            <button
              key={r}
              onClick={() => setRangeAndUrl(r)}
              disabled={loading}
              aria-pressed={active}
              className={[
                "h-8 rounded-md px-3 text-sm transition",
                "border border-zinc-800",
                active
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900/60",
              ].join(" ")}
            >
              {r.toUpperCase()}
            </button>
          );
        })}
        {loading && <span className="text-xs text-zinc-400">Loading…</span>}
      </div>

      {/* Top strip: Total P&L + Motivation banner */}
      <section className="flex flex-col md:flex-row gap-4">
        <div className="md:w-[420px]">
          <KPI
            label="Total P&L"
            value={fmtUsd(data.kpis.netPnl)}
            positive={data.kpis.netPnl > 0}
            negative={data.kpis.netPnl < 0}
          />
        </div>

        <div className="glass flex-1 p-4 md:p-5 flex items-center gap-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full
                       border border-emerald-400/30 bg-emerald-500/10"
            aria-hidden
          >
            <Activity className="h-5 w-5 text-white/90" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs uppercase tracking-wide text-emerald-400 font-semibold opacity-80">
              Coach Tip
            </span>
            <span className="text-base font-medium text-emerald-200 italic mt-1">
              {phraseOfDay}
            </span>
          </div>
        </div>
      </section>

      {/* Balance growth chart (labels/tooltips use local timezone) */}
      <section className="glass p-4">
        <div className="mb-2 text-sm text-zinc-400">
          Balance growth — {prettyRange}
        </div>
        <SparklineInteractive
          data={data.equity}
          className="mt-2 cursor-crosshair"
          showAxes
          showGrid
          yTicks={4}
          xTicks={5}
          showTooltip
          timeZone={tz}
        />
      </section>

      {/* visual summary widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        <GaugeWinRate wins={stats.wins} losses={stats.losses} />
        <DonutProfitSplit
          grossWins={stats.grossWins}
          grossLossesAbs={stats.grossLossesAbs}
          profitFactor={stats.profitFactor}
        />
        <AvgWinLossBar avgWin={stats.avgWin} avgLossAbs={stats.avgLossAbs} />
      </div>

      {/* calendar + trades */}
      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        <div className="h-full">
          <CalendarPreview
            days={data.calendar}
            year={calYear}
            month={calMonth}
            onPrevMonth={() => shiftMonth(-1)}
            onNextMonth={() => shiftMonth(+1)}
          />
        </div>
        <div className="h-full">
          <TradesTable rows={data.trades} />
        </div>
      </div>

      {/* extras (histogram labels/tooltips use local timezone) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TopSymbols trades={data.trades} />
        </div>
        <div className="lg:col-span-2">
          <PnLHistogram
            trades={data.trades}
            range={range}
            height={480}
            className="min-h-[360px]"
            timeZone={tz}
          />
        </div>
      </div>
    </div>
  );
}
