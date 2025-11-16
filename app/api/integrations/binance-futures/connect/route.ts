// app/api/integrations/binance-futures/connect/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { verifyBinanceKey } from "@/lib/binance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  label: z.string().trim().max(100).optional().nullable(),
  apiKey: z.string().trim().min(10),
  secret: z.string().trim().min(10),
});

export async function POST(req: Request) {
  try {
    const userId = await authUserId();

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { label, apiKey, secret } = parsed.data;

    // 1) Verify the key against Binance (Futures-aware helper, see lib/binance.ts below)
    const verify = await verifyBinanceKey(apiKey, secret);
    if (!verify.ok) {
      console.error("[binance-futures] verification failed:", verify);
      return NextResponse.json(
        {
          error:
            "Binance rejected these keys. Check that API key, secret and permissions are correct.",
        },
        { status: 400 }
      );
    }

    // 2) Encrypt and store
    const encApiKey = encrypt(apiKey);
    const encSecret = encrypt(secret);
    const keyLast4 = apiKey.slice(-4);

    const created = await prisma.apiKey.create({
      data: {
        userId,
        provider: "binance", // keep consistent with your page.tsx filter
        label: label && label.trim().length ? label.trim() : null,
        keyLast4,
        encApiKey,
        encSecret,
        // status defaults to "active"
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error("[binance-futures/connect] error:", err);
    return NextResponse.json(
      { error: "Failed to save Binance API key" },
      { status: 500 }
    );
  }
}
