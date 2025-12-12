import { NextResponse } from "next/server";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { testBybitKeys } from "@/lib/bybit";

export const runtime = "nodejs";
export const preferredRegion = ["fra1"];

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
    return NextResponse.json({ error: "Missing apiKey or apiSecret" }, { status: 400 });
  }

  const result = await testBybitKeys(apiKey, apiSecret);
  if (!result.ok) {
    console.error("[bybit-futures/connect] validation failed", result);
    return NextResponse.json(
      {
        error: "Failed to validate Bybit API key/secret.",
        details: result,
      },
      { status: 400 }
    );
  }

  const apiKeyEnc = encrypt(apiKey);
  const apiSecretEnc = encrypt(apiSecret);

  const brokerAccount = await prisma.brokerAccount.upsert({
    where: {
      userId_broker: { userId, broker: "bybit-futures" },
    },
    update: { label, apiKeyEnc, apiSecretEnc },
    create: { userId, broker: "bybit-futures", label, apiKeyEnc, apiSecretEnc },
  });

  return NextResponse.json({ ok: true, brokerAccountId: brokerAccount.id });
}
