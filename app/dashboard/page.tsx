// app/dashboard/page.tsx
import { headers } from "next/headers";
import { requireMember } from "@/lib/membership";
import DashboardClient from "./DashboardClient";
import type { Metadata } from "next";

type RangeKey = "7d" | "30d" | "ytd" | "all";

// This type matches what /api/me/summary returns
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

// Anything with .get() works (Headers, ReadonlyHeaders)
type HeaderLike = { get(name: string): string | null };

function baseFrom(h: HeaderLike) {
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

export const metadata: Metadata = {
  title: "Dashboard • Trading Journal",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { range?: RangeKey };
}) {
  // Block access unless user is an active member (or trial)
  await requireMember();

  const sp = searchParams ?? {};
  const initialRange: RangeKey = (sp.range as RangeKey) ?? "30d";

  // ✅ headers() now awaited -> Promise<ReadonlyHeaders> → ReadonlyHeaders
  const h = await headers();
  const base = baseFrom(h);

  let data: Summary = EMPTY_SUMMARY;

  try {
    const res = await fetch(`${base}/api/me/summary?range=${initialRange}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        "[dashboard] summary fetch failed",
        res.status,
        res.statusText
      );
    } else {
      data = (await res.json()) as Summary;
    }
  } catch (err) {
    console.error("[dashboard] error while fetching /api/me/summary", err);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <DashboardClient initial={data} initialRange={initialRange} />
    </div>
  );
}
