
import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await authUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

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

    // Parse CSV into objects; first row = header
    let records: any[];
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err) {
      console.error("[binance-futures/import] CSV parse error", err);
      return NextResponse.json(
        { error: "Failed to parse CSV file" },
        { status: 400 }
      );
    }

    const executionsData: any[] = [];

    for (const row of records) {
      // 🔹 Adjust these header names once you see your real Binance CSV.
      // Common Binance Futures export headers include:
      // "Date(UTC)", "Symbol", "Side", "Price", "Realized PnL", "Fee", "Executed Qty"
      const symbol =
        row["Symbol"] || row["Pair"] || row["Contract"] || row["symbol"];
      const sideRaw = row["Side"] || row["side"];
      const qtyRaw =
        row["Executed Qty"] ||
        row["Quantity"] ||
        row["Qty"] ||
        row["amount"];
      const priceRaw = row["Price"] || row["Avg Price"] || row["price"];
      const feeRaw = row["Fee"] || row["Commission"] || row["fee"];

      if (!symbol || !sideRaw || !qtyRaw || !priceRaw) {
        // skip incomplete rows
        continue;
      }

      // Prisma enum Side: BUY | SELL
      const sideUpper = String(sideRaw).toUpperCase();
      const side = sideUpper.startsWith("BUY") || sideUpper.startsWith("LONG")
        ? "BUY"
        : "SELL";

      const qty = Number(qtyRaw) || 0;
      const price = Number(priceRaw) || 0;
      const fee = feeRaw ? Number(feeRaw) || 0 : 0;

      // Date – Binance often uses "Date(UTC)" like "2024-01-01 12:34:56"
      const dateStr =
        row["Date(UTC)"] ||
        row["Update Time(UTC)"] ||
        row["Time"] ||
        row["Created Time"] ||
        row["date"];

      let execTime = new Date();
      if (dateStr && typeof dateStr === "string") {
        // Try to convert "YYYY-MM-DD HH:mm:ss" to ISO
        const isoLike = dateStr.replace(" ", "T");
        execTime = new Date(isoLike.endsWith("Z") ? isoLike : isoLike + "Z");
        if (Number.isNaN(execTime.getTime())) {
          execTime = new Date();
        }
      }

      executionsData.push({
        brokerAccountId: brokerAccount.id,
        symbol,
        side,   // "BUY" | "SELL" (Side enum)
        qty,
        price,
        fee,
        execTime,
      });
    }

    if (executionsData.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in CSV (check headers mapping)." },
        { status: 400 }
      );
    }

    // Insert executions
    await prisma.execution.createMany({
      data: executionsData as any,
      skipDuplicates: true,
    });

    return NextResponse.json({
      ok: true,
      imported: executionsData.length,
    });
  } catch (err) {
    console.error("[binance-futures/import] error", err);
    return NextResponse.json(
      { error: "Failed to import Binance Futures CSV" },
      { status: 500 }
    );
  }
}
