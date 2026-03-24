
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { authUserId } from "@/lib/auth";
import { Plan as PlanEnum } from "@prisma/client"; 

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PostCheckout({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  if (!sessionId) {
    redirect("/dashboard");
  }

  const userId = await authUserId();

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const subscription = session.subscription as string | Stripe.Subscription | null;
  const subscriptionId =
    typeof subscription === "string" ? subscription : subscription?.id ?? undefined;

  
  const customer = session.customer as string | Stripe.Customer | null;
  const customerId =
    typeof customer === "string" ? customer : customer?.id ?? undefined;

  
  const planMeta = session.metadata?.plan;
  const plan: PlanEnum | undefined =
    planMeta === "monthly" || planMeta === "annual"
      ? (planMeta as PlanEnum)
      : undefined;

  const trialEndsAt =
    typeof subscription === "object" && subscription?.trial_end
      ? new Date(subscription.trial_end * 1000)
      : undefined;

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      ...(plan ? { plan: { set: plan } } : {}),
      ...(trialEndsAt ? { trialEndsAt } : {}),
    },
  });

  redirect("/dashboard?welcome=1");
}
