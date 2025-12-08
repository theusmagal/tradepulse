
import { NextResponse } from "next/server";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { fetchBybitExecutionsFromClosedPnl } from "@/lib/bybit";

export const runtime = "nodejs";

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

  const fromMs =
    account.lastSyncAt?.getTime() ??
    now - 90 * 24 * 60 * 60 * 1000; 

  const toMs = now;

  const executions = await fetchBybitExecutionsFromClosedPnl(
    apiKey,
    apiSecret,
    fromMs,
    toMs
  );

  if (!executions.length) {
    await prisma.brokerAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(toMs) },
    });

    return NextResponse.json({ imported: 0 });
  }

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

  await prisma.brokerAccount.update({
    where: { id: account.id },
    data: { lastSyncAt: new Date(toMs) },
  });

  return NextResponse.json({ imported: data.length });
}
