// app/api/me/journal/route.ts
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

function parseYm(ym?: string | null): { start: Date; end: Date } | null {
  if (!ym) return null;
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;

  // UTC month boundaries (consistent with your dashboard calendar)
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function GET(req: Request) {
  const member = await requireMemberApi();
  if (!member) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const ym = url.searchParams.get("ym");
  const q = (url.searchParams.get("q") || "").trim();
  const limitRaw = Number(url.searchParams.get("limit") || "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

  const month = parseYm(ym);

  const where: any = { userId: member.userId };

  if (month) {
    where.entryDate = { gte: month.start, lt: month.end };
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }

  const entries = await prisma.diaryEntry.findMany({
    where,
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    take: limit,
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
    entries: entries.map((e) => ({
      id: e.id,
      title: e.title ?? "",
      content: e.content,
      entryDate: e.entryDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const member = await requireMemberApi();
  if (!member) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

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

  let entryDate = new Date();
  if (typeof body.entryDate === "string" && body.entryDate.trim()) {
    const d = new Date(body.entryDate);
    if (!Number.isNaN(d.getTime())) entryDate = d;
  }

  const created = await prisma.diaryEntry.create({
    data: {
      userId: member.userId,
      title: title || null,
      content,
      entryDate,
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
      id: created.id,
      title: created.title ?? "",
      content: created.content,
      entryDate: created.entryDate.toISOString(),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
  });
}