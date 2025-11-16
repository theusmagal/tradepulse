// app/settings/integrations/page.tsx
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BinanceFuturesForm from "./BinanceFuturesForm";

export const runtime = "nodejs";

export default async function IntegrationsPage() {
  const userId = await authUserId();

  const futuresAccount = await prisma.brokerAccount.findFirst({
    where: { userId, broker: "BINANCE_FUTURES" },
    select: {
      id: true,
      label: true,
      lastSyncAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="glass p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Integrations</h1>

      <p className="text-sm text-zinc-400">
        Connect your Binance Futures account. Your API key and secret are
        encrypted before being stored.
      </p>

      <BinanceFuturesForm
        connected={!!futuresAccount}
        existingLabel={futuresAccount?.label ?? null}
      />

      {futuresAccount && (
        <p className="text-xs text-zinc-500">
          Connected as{" "}
          <span className="font-medium">{futuresAccount.label}</span> (since{" "}
          {futuresAccount.createdAt.toLocaleDateString()})
        </p>
      )}
    </div>
  );
}
