
import { prisma } from "@/lib/prisma";
import { authUserId } from "@/lib/auth";
import { AddBinanceForm, KeysList } from "../Integrations";

export const runtime = "nodejs";

export default async function IntegrationsPage() {
  const userId = await authUserId();

  const keys = await prisma.apiKey.findMany({
    where: { userId, provider: "binance" },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, keyLast4: true, status: true },
  });

  return (
    <div className="glass p-4 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold mb-2">Binance Futures</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Connect a read-only Binance USDT-M Futures API key. We’ll use it to
          import your trades into TradePulse.
        </p>
        <AddBinanceForm />
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Your API keys</h3>
        <KeysList keys={keys} />
      </div>
    </div>
  );
}
