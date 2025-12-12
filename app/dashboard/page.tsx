
import { requireMember } from "@/lib/membership";
import DashboardClient from "./DashboardClient";
import type { Metadata } from "next";

type RangeKey = "7d" | "30d" | "ytd" | "all";

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

const EMPTY_SUMMARY: Summary = {
  kpis: {
    netPnl: 0,
    winRate: 0,
    profitFactor: 0,
    avgR: 0,
    tradeCount: 0,
  },
  equity: [{ x: Date.now(), y: 10_000 }],
  calendar: [],
  trades: [],
};

export const metadata: Metadata = {
  title: "Dashboard • Trading Journal",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireMember();

  const sp = (await searchParams) ?? {};
  const initialRange: RangeKey = (sp.range as RangeKey) ?? "30d";


  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <DashboardClient initial={EMPTY_SUMMARY} initialRange={initialRange} />
    </div>
  );
}
