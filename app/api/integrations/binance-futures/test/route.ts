// app/api/integrations/binance-futures/test/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { authUserId } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { verifyBinanceKey } from "@/lib/binance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  apiKeyEnc: z.string(),
  apiSecretEnc: z.string(),
});

export async function POST(req: Request) {
  // Require login
  const userId = await authUserId().catch(() => null);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse JSON
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { apiKeyEnc, apiSecretEnc } = parsed.data;

  // Decrypt credentials
  let apiKey: string;
  let secret: string;
  try {
    apiKey = decrypt(apiKeyEnc);
    secret = decrypt(apiSecretEnc);
  } catch {
    return NextResponse.json(
      { error: "Failed to decrypt credentials" },
      { status: 400 }
    );
  }

  // Call Binance Futures via our helper
  const result = await verifyBinanceKey(apiKey, secret);

  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { ok: false, status: result.status, msg: result.msg },
    { status: 400 }
  );
}
