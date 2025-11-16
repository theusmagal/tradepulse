// app/settings/integrations/page.tsx
import { prisma } from "@/lib/prisma";
import { authUserId } from "@/lib/auth";
import { AddBinanceForm, KeysList } from "./BinanceFuturesForm"; // ← update this line

export default async function IntegrationsPage() {
  const userId = await authUserId();
  const keys = await prisma.apiKey.findMany({
    where: { userId, provider: "binance" },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, keyLast4: true, status: true },
  });

  return (
    <div className="glass p-4 space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-2">Binance</h2>
        <AddBinanceForm />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Your keys</h3>
        <KeysList keys={keys} />
      </div>
    </div>
  );
}
