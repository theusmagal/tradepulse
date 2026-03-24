
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isActiveStatus(s?: string | null): boolean {
  return s === "active" || s === "trialing";
}

async function requireMemberApi(): Promise<{ userId: string } | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, trialEndsAt: true },
  });

  const now = new Date();
  const onTrial = user?.trialEndsAt ? user.trialEndsAt > now : false;
  const ok = isActiveStatus(user?.subscriptionStatus) || onTrial;
  if (!ok) return null;

  return { userId };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await requireMemberApi();
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await ctx.params;

  const entry = await prisma.diaryEntry.findFirst({
    where: { id, userId: member.userId },
    select: {
      id: true,
      title: true,
      content: true,
      entryDate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    entry: {
      id: entry.id,
      title: entry.title ?? "",
      content: entry.content,
      entryDate: entry.entryDate.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    },
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await requireMemberApi();
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));

  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";

  const content =
    typeof body.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (content.length > 10000) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }

  let entryDate: Date | undefined = undefined;
  if (typeof body.entryDate === "string" && body.entryDate.trim()) {
    const d = new Date(body.entryDate);
    if (!Number.isNaN(d.getTime())) entryDate = d;
  }

  const existing = await prisma.diaryEntry.findFirst({
    where: { id, userId: member.userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.diaryEntry.update({
    where: { id },
    data: {
      title: title || null,
      content,
      ...(entryDate ? { entryDate } : {}),
    },
    select: {
      id: true,
      title: true,
      content: true,
      entryDate: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    entry: {
      id: updated.id,
      title: updated.title ?? "",
      content: updated.content,
      entryDate: updated.entryDate.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await requireMemberApi();
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await ctx.params;

  const existing = await prisma.diaryEntry.findFirst({
    where: { id, userId: member.userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.diaryEntry.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}