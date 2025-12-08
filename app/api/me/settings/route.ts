// app/api/me/settings/route.ts
import { NextResponse } from "next/server";
import { authUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const userId = await authUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      timezone: true,
      startingBalance: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    email: user.email,
    name: user.name ?? "",
    timezone: user.timezone ?? "UTC",
    startingBalance: Number(user.startingBalance ?? 10000),
  });
}

export async function PUT(req: Request) {
  const userId = await authUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const timezone =
    typeof body.timezone === "string" && body.timezone.trim()
      ? body.timezone.trim()
      : "UTC";

  const sbRaw = Number(body.startingBalance);
  let startingBalance = Number.isFinite(sbRaw) ? sbRaw : 10000;
  if (startingBalance < 0) startingBalance = 0;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name, timezone, startingBalance },
    select: {
      email: true,
      name: true,
      timezone: true,
      startingBalance: true,
    },
  });

  return NextResponse.json({
    email: updated.email,
    name: updated.name ?? "",
    timezone: updated.timezone ?? "UTC",
    startingBalance: Number(updated.startingBalance ?? 10000),
  });
}
