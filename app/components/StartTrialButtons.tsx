
'use client';

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function StartTrialButtons() {
  const { status } = useSession();
  const authed = status === "authenticated";

  async function startCheckout(plan: "monthly" | "annual") {
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error("checkout 401/500");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      
      window.location.href = "/pricing?error=checkout";
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      {authed ? (
        <>
          <button
            onClick={() => startCheckout("monthly")}
            className="rounded-md px-5 py-3 font-medium
                       bg-emerald-500 text-zinc-900 hover:bg-emerald-400
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            Start 14-day trial — Monthly
          </button>
          <button
            onClick={() => startCheckout("annual")}
            className="rounded-md px-5 py-3 font-medium
                       border border-zinc-700/70 text-zinc-200 hover:bg-zinc-900/60
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            Start 14-day trial — Annual
          </button>
        </>
      ) : (
        <>
          <Link
            href="/auth/register?plan=monthly"
            className="rounded-md px-5 py-3 font-medium
                       bg-emerald-500 text-zinc-900 hover:bg-emerald-400
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            Start 14-day trial — Monthly
          </Link>
          <Link
            href="/auth/register?plan=annual"
            className="rounded-md px-5 py-3 font-medium
                       border border-zinc-700/70 text-zinc-200 hover:bg-zinc-900/60
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            Start 14-day trial — Annual
          </Link>
        </>
      )}
    </div>
  );
}
