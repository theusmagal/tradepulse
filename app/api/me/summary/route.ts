// app/api/me/summary/route.ts
import { NextResponse } from "next/server";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Trade as TradeModel } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RangeKey = "7d" | "30d" | "ytd" | "all";

function rangeStart(range: RangeKey): Date | null {
  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
    default:
      return null;
  }
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

// ---- Treat each row in Trade as a trade ----
function buildTrades(trades: TradeModel[]) {
  return trades.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    side: t.side, // "BUY" | "SELL"
    qty: t.qty.toString(),
    price: t.avgExit.toString(),
    pnl: Number(t.netPnl ?? 0),
    time: t.closeTime.toISOString(),
  }));
}

function buildKpis(trades: TradeModel[]) {
  const tradeCount = trades.length;
  if (!tradeCount) {
    return {
      netPnl: 0,
      winRate: 0,
      profitFactor: 0,
      avgR: 0,
      tradeCount: 0,
    };
  }

  const realized = trades.map((t) => Number(t.netPnl ?? 0));
  const netPnl = realized.reduce((a, v) => a + v, 0);

  const wins = realized.filter((v) => v > 0);
  const losses = realized.filter((v) => v < 0);

  const grossWins = wins.reduce((a, v) => a + v, 0);
  const grossLossesAbs = Math.abs(losses.reduce((a, v) => a + v, 0));

  const winRate = tradeCount ? Math.round((wins.length / tradeCount) * 100) : 0;
  const profitFactor =
    grossLossesAbs > 0
      ? Number((grossWins / grossLossesAbs).toFixed(2))
      : wins.length
      ? Infinity
      : 0;

  const avgWin = wins.length ? grossWins / wins.length : 0;
  const avgLossAbs = losses.length ? grossLossesAbs / losses.length : 0;
  const avgR = avgLossAbs > 0 ? Number((avgWin / avgLossAbs).toFixed(2)) : 0;

  return {
    netPnl: Number(netPnl.toFixed(2)),
    winRate,
    profitFactor,
    avgR,
    tradeCount,
  };
}

function buildEquity(trades: TradeModel[]) {
  const START_BALANCE = 10_000;
  if (!trades.length) {
    const now = Date.now();
    return [{ x: now, y: START_BALANCE }];
  }

  let running = START_BALANCE;
  const points = trades
    .slice()
    .sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime())
    .map((t) => {
      running += Number(t.netPnl ?? 0);
      return { x: t.closeTime.getTime(), y: Number(running.toFixed(2)) };
    });

  return points;
}

function buildCalendar(allTrades: TradeModel[], ymParam: string | null) {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month1 = now.getUTCMonth() + 1; // 1..12

  if (ymParam) {
    const [yStr, mStr] = ymParam.split("-");
    const yNum = Number(yStr);
    const mNum = Number(mStr);
    if (!Number.isNaN(yNum) && !Number.isNaN(mNum) && mNum >= 1 && mNum <= 12) {
      year = yNum;
      month1 = mNum;
    }
  }

  const dim = daysInMonth(year, month1);
  const dayMap: Record<number, { pnl: number; trades: number }> = {};

  for (const t of allTrades) {
    const d = t.closeTime;
    const y = d.getUTCFullYear();
    const m1 = d.getUTCMonth() + 1;
    if (y !== year || m1 !== month1) continue;

    const day = d.getUTCDate();
    if (!dayMap[day]) {
      dayMap[day] = { pnl: 0, trades: 0 };
    }
    dayMap[day].pnl += Number(t.netPnl ?? 0);
    dayMap[day].trades += 1;
  }

  const calendar = Array.from({ length: dim }, (_, i) => {
    const day = i + 1;
    const stats = dayMap[day] || { pnl: 0, trades: 0 };
    return {
      day,
      pnl: Number(stats.pnl.toFixed(2)),
      trades: stats.trades,
    };
  });

  return calendar;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") as RangeKey) || "30d";
  const ym = url.searchParams.get("ym");

  const userId = await authUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get all Binance Futures broker accounts for this user
  const brokerAccounts = await prisma.brokerAccount.findMany({
    where: {
      userId,
      broker: "binance-futures",
    },
    select: { id: true },
  });

  if (!brokerAccounts.length) {
    const now = Date.now();
    return NextResponse.json({
      kpis: {
        netPnl: 0,
        winRate: 0,
        profitFactor: 0,
        avgR: 0,
        tradeCount: 0,
      },
      equity: [{ x: now, y: 10_000 }],
      calendar: [],
      trades: [],
    });
  }

  const accountIds = brokerAccounts.map((b) => b.id);

  // Fetch trades for these accounts
  const allTrades = await prisma.trade.findMany({
    where: {
      brokerAccountId: { in: accountIds },
    },
    orderBy: { closeTime: "asc" },
  });

  const from = rangeStart(range);
  const rangeTrades: TradeModel[] = from
    ? allTrades.filter((t) => t.closeTime >= from)
    : allTrades;

  const trades = buildTrades(rangeTrades);
  const kpis = buildKpis(rangeTrades);
  const equity = buildEquity(rangeTrades);
  const calendar = buildCalendar(allTrades, ym);

  return NextResponse.json({
    kpis,
    equity,
    calendar,
    trades,
  });
}
