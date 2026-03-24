
import { NextResponse } from "next/server";
import type Stripe from "stripe";            
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubUnix = { current_period_end?: number | null; trial_end?: number | null };

function subTimes(sub: Stripe.Subscription) {
  const s = sub as unknown as SubUnix;
  const currentPeriodEnd =
    typeof s.current_period_end === "number" ? new Date(s.current_period_end * 1000) : null;
  const trialEnd =
    typeof s.trial_end === "number" ? new Date(s.trial_end * 1000) : null;
  return { currentPeriodEnd, trialEnd };
}

function mapPlan(plan: string | undefined): "PRO_MONTHLY" | "PRO_ANNUAL" | null {
  if (plan === "monthly") return "PRO_MONTHLY";
  if (plan === "annual") return "PRO_ANNUAL";
  return null;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] signature verify failed:", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerId = (session.customer as string | null) ?? "";
        const subscriptionId = (session.subscription as string | null) ?? "";
        if (!subscriptionId) {
          console.warn("[webhook] checkout.session.completed: missing subscriptionId");
          break;
        }

        const sub = (await stripe.subscriptions.retrieve(
          subscriptionId
        )) as Stripe.Subscription;

        // Find user
        const byCustomer = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });
        const metaUserId = sub.metadata?.userId;
        const userId = byCustomer?.id ?? (typeof metaUserId === "string" ? metaUserId : undefined);
        if (!userId) {
          console.warn("[webhook] checkout.session.completed: no userId");
          break;
        }

        const plan = mapPlan(sub.metadata?.plan);
        const { currentPeriodEnd, trialEnd } = subTimes(sub);

        // Update user
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: plan ?? undefined,
            trialEndsAt: trialEnd ?? undefined,
            stripeCustomerId: customerId,
            stripeSubId: sub.id,
            subscriptionStatus: sub.status,
          },
        });

        // Upsert subscription snapshot
        await prisma.billingSubscription.upsert({
          where: { stripeSubscriptionId: subscriptionId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: sub.status,
            currentPeriodEnd,
            trialEnd,
          },
          update: {
            status: sub.status,
            currentPeriodEnd,
            trialEnd,
          },
        });

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const subscriptionId = sub.id;
        const customerId = (sub.customer as string | null) ?? "";

        const byCustomer = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });
        const metaUserId = sub.metadata?.userId;
        const userId = byCustomer?.id ?? (typeof metaUserId === "string" ? metaUserId : undefined);
        if (!userId) {
          console.warn(`[webhook] ${event.type}: no userId`);
          break;
        }

        const { currentPeriodEnd, trialEnd } = subTimes(sub);

        await prisma.billingSubscription.upsert({
          where: { stripeSubscriptionId: subscriptionId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: sub.status,
            currentPeriodEnd,
            trialEnd,
          },
          update: {
            status: sub.status,
            currentPeriodEnd,
            trialEnd,
          },
        });

        const isInactive = ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);

        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeSubId: sub.id,
            subscriptionStatus: sub.status,
            ...(isInactive ? { plan: null } : {}),
          },
        });

        break;
      }

      default:
        console.log("[webhook] Unhandled event:", event.type);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] handler error:", msg);
  }

  return NextResponse.json({ ok: true });
}
