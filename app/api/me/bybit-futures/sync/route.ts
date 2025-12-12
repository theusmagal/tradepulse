// app/api/me/bybit-futures/sync/route.ts
import { NextResponse } from "next/server";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { fetchBybitExecutionsFromClosedPnl } from "@/lib/bybit";

export const runtime = "nodejs";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LOOKBACK_DAYS = 365;
const MAX_LOOKBACK_MS = MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

export async function POST() {
  const userId = await authUserId();

  const account = await prisma.brokerAccount.findFirst({
    where: {
      userId,
      broker: "bybit-futures",
    },
  });

  if (!account) {
    return NextResponse.json(
      { error: "No Bybit futures account connected." },
      { status: 400 }
    );
  }

  const apiKey = decrypt(account.apiKeyEnc);
  const apiSecret = decrypt(account.apiSecretEnc);

  const now = Date.now();

  // Where to start:
  // - If we've synced before, start from lastSyncAt.
  // - Otherwise, look back MAX_LOOKBACK_DAYS (e.g. 90 days).
  const lastSyncTime = account.lastSyncAt?.getTime();
  const defaultFrom = now - MAX_LOOKBACK_MS;
  let fromMs = lastSyncTime ?? defaultFrom;

  // Never look back more than MAX_LOOKBACK_DAYS from "now"
  if (fromMs < defaultFrom) {
    fromMs = defaultFrom;
  }

  // Also ensure fromMs is not in the future
  if (fromMs > now) {
    fromMs = now - SEVEN_DAYS_MS;
  }

  const toMs = now;

  let totalImported = 0;

  try {
    let windowStart = fromMs;

    while (windowStart < toMs) {
      const windowEnd = Math.min(windowStart + SEVEN_DAYS_MS - 1, toMs);

      // Fetch executions for this 7-day segment
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

        await prisma.execution.createMany({
          data,
          skipDuplicates: true,
        });

        totalImported += data.length;
      }

      // Move to next window
      windowStart = windowEnd + 1;
    }

    // Update lastSyncAt to "now" so next sync only looks forward
    await prisma.brokerAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(toMs) },
    });

    return NextResponse.json({ imported: totalImported });
  } catch (err) {
    console.error("[Bybit sync] error", err);
    const message =
      err instanceof Error ? err.message : "Unknown Bybit sync error";
    return NextResponse.json(
      { error: `Failed to sync Bybit data: ${message}` },
      { status: 500 }
    );
  }
}
