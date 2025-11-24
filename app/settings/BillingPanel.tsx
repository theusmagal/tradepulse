
"use client";

import { useState } from "react";

type Plan = "PRO_MONTHLY" | "PRO_ANNUAL";

type Props = {
  plan?: Plan;
  portalUrl?: string | null;
  trialEndsAt?: string | null;
};

function formatDateStable(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Failed to open billing portal (${res.status})`);
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe Billing Portal
      } else {
        throw new Error("Missing portal URL");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unexpected error";
      setErr(msg);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
      >
        {loading ? "Opening portal…" : "Manage subscription"}
      </button>
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}

export default function BillingPanel({ plan, trialEndsAt }: Props) {
  const hasPlan = plan === "PRO_MONTHLY" || plan === "PRO_ANNUAL";

  const planLabel =
    plan === "PRO_ANNUAL" ? "Annual" : plan === "PRO_MONTHLY" ? "Monthly" : "Not subscribed";

  const trialDate = trialEndsAt ? new Date(trialEndsAt) : null;
  const trialActive = !!trialDate && trialDate.getTime() > Date.now();
  const trialLabel = trialDate ? formatDateStable(trialDate) : null;

  return (
    <div className="glass p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Billing</h1>

      <div className="text-sm text-zinc-400">Current plan</div>
      <div className="text-lg">{planLabel}</div>

      {trialActive && trialLabel && (
        <div className="text-sm text-emerald-500">
          Trial active — ends {trialLabel}
        </div>
      )}

      <div className="pt-2">
        {hasPlan ? (
          <ManageSubscriptionButton />
        ) : (
          <span className="text-sm text-zinc-500">
            You don’t have an active subscription.
          </span>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Subscriptions include a 14-day trial. Your active trial end date appears here.
      </p>
    </div>
  );
}
