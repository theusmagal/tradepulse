import { authUserId } from "@/lib/auth";
import { AddBinanceForm } from "../Integrations";

export const runtime = "nodejs";

export default async function IntegrationsPage() {
  await authUserId();

  return (
    <div className="glass p-4 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold mb-2">Binance Futures</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Import your Binance USDT-M Futures trades using CSV files. We&apos;ll
          store the executions and update your dashboard.
        </p>
        <AddBinanceForm />
      </div>
    </div>
  );
}
