import { NextResponse } from "next/server";
import { z } from "zod";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  plan: z.enum(["monthly", "annual"]).default("monthly"),
});

function priceIdFor(plan: "monthly" | "annual") {
  const monthly =
    process.env.STRIPE_PRICE_MONTHLY ?? process.env.STRIPE_PRICE_ID_MONTHLY;
  const annual =
    process.env.STRIPE_PRICE_ANNUAL ?? process.env.STRIPE_PRICE_ID_ANNUAL;

  const id = plan === "annual" ? annual : monthly;
  if (!id) {
    throw new Error(
      `Stripe price not configured for ${plan}. Set STRIPE_PRICE_ID_${plan === "annual" ? "ANNUAL" : "MONTHLY"}`
    );
  }
  return id;
}

function baseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.replace(/\/+$/, "");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

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
    const { plan } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, stripeCustomerId: true },
    });
    if (!user?.email) {
      return NextResponse.json({ error: "User email missing" }, { status: 400 });
    }

    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    } else {
      try {
        await stripe.customers.update(customerId, { metadata: { userId } });
      } catch {
      }
    }

    const appUrl = baseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      client_reference_id: userId,
      line_items: [{ price: priceIdFor(plan), quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId, plan }, 
      },
      metadata: { userId, plan },    
      success_url: `${appUrl}/dashboard?welcome=1`,
      cancel_url: `${appUrl}/pricing?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error(e);
    const msg =
      e instanceof Error && /price not configured/i.test(e.message)
        ? e.message
        : "Failed to create checkout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
