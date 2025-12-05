// app/api/me/binance-futures/import/route.ts
import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BinanceCsvRow = Record<string, string>;

function getAny(row: BinanceCsvRow, keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return undefined;
}

function parseNumber(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: string | undefined): Date {
  if (!v) return new Date();
  const trimmed = v.trim();
  // Try to normalize "YYYY-MM-DD HH:MM:SS" -> ISO
  const isoLike = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T");

  const withZ = isoLike.endsWith("Z") ? isoLike : isoLike + "Z";
  const d = new Date(withZ);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

type TradeInput = {
  brokerAccountId: string;
  symbol: string;
  side: "BUY" | "SELL";
  openTime: Date;
  closeTime: Date;
  qty: number;
  avgEntry: number;
  avgExit: number;
  grossPnl: number;
  netPnl: number;
  fees: number;
};

export async function POST(req: Request) {
  try {
    const userId = await authUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Find or create a broker account for Binance Futures CSV
    let brokerAccount = await prisma.brokerAccount.findFirst({
      where: { userId, broker: "binance-futures" },
    });

    if (!brokerAccount) {
      brokerAccount = await prisma.brokerAccount.create({
        data: {
          userId,
          broker: "binance-futures",
          label: "Binance Futures (CSV)",
          apiKeyEnc: "csv-import",
          apiSecretEnc: "csv-import",
        },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "CSV file is required (field name: file)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const csvText = buffer.toString("utf-8");

    let records: BinanceCsvRow[];
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as BinanceCsvRow[];
    } catch (err) {
      console.error("[binance-futures/import] CSV parse error", err);
      return NextResponse.json(
        { error: "Failed to parse CSV file" },
        { status: 400 }
      );
    }

    const tradesData: TradeInput[] = [];

    for (const row of records) {
      const symbol =
        getAny(row, ["Symbol", "symbol", "Pair", "Contract"]) ?? "";
      const sideRaw =
        getAny(row, ["Side", "side", "Position Side"]) ?? "";
      if (!symbol || !sideRaw) continue;

      const sideUpper = sideRaw.toUpperCase();
      const side: "BUY" | "SELL" =
        sideUpper.startsWith("BUY") || sideUpper.startsWith("LONG")
          ? "BUY"
          : "SELL";

      // Quantity
      const qty = parseNumber(
        getAny(row, [
          "Size",
          "Qty",
          "Quantity",
          "Executed Qty",
          "Realized Size",
          "Amount",
          "Position Size",
        ])
      );

      // Prices
      const entryPrice = parseNumber(
        getAny(row, [
          "Entry Price",
          "Open Price",
          "Avg Entry Price",
          "Average Entry Price",
        ])
      );
      const exitPrice = parseNumber(
        getAny(row, [
          "Exit Price",
          "Close Price",
          "Avg Close Price",
          "Average Close Price",
          "Price",
        ])
      );

      // Times
      const openTime = parseDate(
        getAny(row, [
          "Open Time",
          "Entry Time",
          "Created Time",
          "Start Time",
        ])
      );
      const closeTime = parseDate(
        getAny(row, [
          "Close Time",
          "Exit Time",
          "Date(UTC)",
          "Update Time(UTC)",
          "Time",
        ])
      );

      // PnL & fees
      const realized = parseNumber(
        getAny(row, [
          "Realized PnL",
          "Realized PNL",
          "Realized P&L",
          "RealizedProfit",
          "Closed PNL (USDT)",
          "PNL",
        ])
      );
      const fee = parseNumber(
        getAny(row, ["Fee", "Commission", "Trading Fee", "Fees"])
      );

      const grossPnl = realized;
      const netPnl = realized - fee;

      tradesData.push({
        brokerAccountId: brokerAccount.id,
        symbol,
        side,
        openTime,
        closeTime,
        qty,
        avgEntry: entryPrice || exitPrice || 0,
        avgExit: exitPrice || entryPrice || 0,
        grossPnl,
        netPnl,
        fees: fee,
      });
    }

    if (tradesData.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in CSV (check headers mapping)." },
        { status: 400 }
      );
    }

    // Insert trades (skip duplicates based on @@unique in Prisma)
    await prisma.trade.createMany({
      data: tradesData,
      skipDuplicates: true,
    });

    return NextResponse.json({
      ok: true,
      imported: tradesData.length,
    });
  } catch (err) {
    console.error("[binance-futures/import] error", err);
    return NextResponse.json(
      { error: "Failed to import Binance Futures CSV" },
      { status: 500 }
    );
  }
}
