import { NextResponse } from "next/server";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { fetchBybitExecutionsFromClosedPnl } from "@/lib/bybit";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LOOKBACK_DAYS = 90;
const MAX_LOOKBACK_MS = MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

export async function POST() {
  const userId = await authUserId();

  const account = await prisma.brokerAccount.findFirst({
    where: { userId, broker: "bybit-futures" },
  });

  if (!account) {
    return NextResponse.json({ error: "No Bybit futures account connected." }, { status: 400 });
  }

  const apiKey = decrypt(account.apiKeyEnc);
  const apiSecret = decrypt(account.apiSecretEnc);

  const now = Date.now();
  const lastSyncTime = account.lastSyncAt?.getTime();
  const defaultFrom = now - MAX_LOOKBACK_MS;

  let fromMs = lastSyncTime ?? defaultFrom;
  if (fromMs < defaultFrom) fromMs = defaultFrom;
  if (fromMs > now) fromMs = now - SEVEN_DAYS_MS;

  const toMs = now;

  let totalImported = 0;

  try {
    let windowStart = fromMs;

    while (windowStart < toMs) {
      const windowEnd = Math.min(windowStart + SEVEN_DAYS_MS - 1, toMs);

      const executions = await fetchBybitExecutionsFromClosedPnl(
        apiKey,
        apiSecret,
        windowStart,
        windowEnd
      );

      if (executions.length) {
        const data = executions.map((e) => ({
          brokerAccountId: account.id,
          symbol: e.symbol,
          side: e.side,
          qty: e.qty,
          price: e.price,
          fee: e.fee,
          realizedPnl: e.realizedPnl,
          execTime: e.execTime,
        }));

        await prisma.execution.createMany({ data, skipDuplicates: true });
        totalImported += data.length;
      }

      windowStart = windowEnd + 1;
    }

    await prisma.brokerAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(toMs) },
    });

    return NextResponse.json({ imported: totalImported });
  } catch (err) {
    console.error("[Bybit sync] error", err);
    const message = err instanceof Error ? err.message : "Unknown Bybit sync error";
    return NextResponse.json({ error: `Failed to sync Bybit data: ${message}` }, { status: 500 });
  }
}
