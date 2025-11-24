
import { NextResponse } from "next/server";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await authUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const accounts = await prisma.brokerAccount.findMany({
      where: { userId, broker: "binance-futures" },
      select: { id: true, label: true },
    });

    if (!accounts.length) {
      return NextResponse.json({ accounts: [], executions: [] });
    }

    const accountIds = accounts.map((a) => a.id);

    const executions = await prisma.execution.findMany({
      where: { brokerAccountId: { in: accountIds } },
      orderBy: { execTime: "desc" },
      take: 200,
      select: {
        id: true,
        brokerAccountId: true,
        symbol: true,
        side: true,
        qty: true,
        price: true,
        fee: true,
        execTime: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ accounts, executions });
  } catch (err) {
    console.error("[me/binance-futures/executions] error", err);
    return NextResponse.json(
      { error: "Failed to load executions" },
      { status: 500 }
    );
  }
}
