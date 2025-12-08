// app/settings/integrations/page.tsx
import { authUserId } from "@/lib/auth";
import { AddBinanceForm, AddBybitForm } from "../Integrations";

export const runtime = "nodejs";

export default async function IntegrationsPage() {
  await authUserId();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Binance Futures CSV (existing) */}
      <div className="glass p-4 space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          Binance Futures (CSV import)
        </h2>
        <p className="text-xs text-zinc-500">
          Import your Binance USDT-M Futures trades using CSV files. We&apos;ll
          store the executions and update your dashboard.
        </p>
        <AddBinanceForm />
      </div>

      {/* Bybit Futures API (new) */}
      <div className="glass p-4 space-y-3">
        <h2 className="text-base font-semibold text-zinc-100">
          Bybit Futures (API)
        </h2>
        <p className="text-xs text-zinc-500">
          Connect your Bybit futures account using an API key with read-only
          permissions. We&apos;ll securely store it encrypted and sync your
          closed PnL to power the dashboard.
        </p>
        <AddBybitForm />
      </div>
    </div>
  );
}
