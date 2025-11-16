import { prisma } from "@/lib/prisma";
import BillingPanel from "../BillingPanel";
import { authUserId } from "@/lib/auth";

type Plan = "PRO_MONTHLY" | "PRO_ANNUAL";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const userId = await authUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, trialEndsAt: true },
  });

  // strictly type: Plan | undefined
  const plan = (user?.plan ?? undefined) as Plan | undefined;
  const trialEndsAt = user?.trialEndsAt ? user.trialEndsAt.toISOString() : null;

  return <BillingPanel plan={plan} trialEndsAt={trialEndsAt} />;
}
