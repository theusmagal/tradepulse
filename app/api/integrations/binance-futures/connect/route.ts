
import { NextResponse } from "next/server";
import { z } from "zod";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { verifyBinanceKey } from "@/lib/binance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  apiKey: z.string().min(10),
  apiSecret: z.string().min(10),
  label: z.string().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await authUserId();

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

    const { apiKey, apiSecret, label } = parsed.data;

    const res = await verifyBinanceKey(apiKey, apiSecret);
    if (!res.ok) {
      console.error("[binance-futures] verification failed:", res);

      if ((res as any).status === 451) {
        return NextResponse.json(
          {
            ok: false,
            reason: "region_blocked",
            message:
              "Binance Futures API is restricted in your region (HTTP 451). Please use CSV import instead.",
            details: res,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Binance futures API key verification failed.",
          details: res,
        },
        { status: 400 }
      );
    }

    const encApiKey = encrypt(apiKey);
    const encSecret = encrypt(apiSecret);
    const keyLast4 = apiKey.slice(-4);

    await prisma.$transaction(async (tx) => {
      await tx.brokerAccount.create({
        data: {
          userId,
          broker: "binance-futures",
          label: label ?? "Binance Futures",
          apiKeyEnc: encApiKey,
          apiSecretEnc: encSecret,
        },
      });

      await tx.apiKey.create({
        data: {
          userId,
          provider: "binance",
          label: label ?? "Binance Futures",
          keyLast4,
          encApiKey,
          encSecret,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[binance-futures/connect] error:", e);
    return NextResponse.json(
      { error: "Failed to save Binance futures key" },
      { status: 500 }
    );
  }
}
