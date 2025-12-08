// app/api/integrations/bybit-futures/connect/route.ts
import { NextResponse } from "next/server";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { testBybitKeys } from "@/lib/bybit";

export const runtime = "nodejs";

type ConnectBody = {
  apiKey?: string;
  apiSecret?: string;
  label?: string;
};

export async function POST(req: Request) {
  const userId = await authUserId();

  const body = (await req.json().catch(() => ({}))) as ConnectBody;
  const apiKey = body.apiKey?.trim();
  const apiSecret = body.apiSecret?.trim();
  const label = body.label?.trim() || "Bybit Futures";

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Missing apiKey or apiSecret" },
      { status: 400 }
    );
  }

  // Basic validation against Bybit API
  const ok = await testBybitKeys(apiKey, apiSecret);
  if (!ok) {
    return NextResponse.json(
      { error: "Failed to validate Bybit API key/secret." },
      { status: 400 }
    );
  }

  const apiKeyEnc = encrypt(apiKey);
  const apiSecretEnc = encrypt(apiSecret);

  // one bybit-futures account per user
  const brokerAccount = await prisma.brokerAccount.upsert({
    where: {
      // requires @@unique([userId, broker], name: "userId_broker") in schema
      userId_broker: {
        userId,
        broker: "bybit-futures",
      },
    },
    update: {
      label,
      apiKeyEnc,
      apiSecretEnc,
    },
    create: {
      userId,
      broker: "bybit-futures",
      label,
      apiKeyEnc,
      apiSecretEnc,
    },
  });

  return NextResponse.json({
    ok: true,
    brokerAccountId: brokerAccount.id,
  });
}
