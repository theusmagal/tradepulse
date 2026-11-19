import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const publicPaths = [
    "/",
    "/pricing",
    "/legal/terms",
    "/legal/privacy",
    "/auth/login",
    "/auth/register",
    "/auth/auto-checkout",
    "/api/register",
    "/api/webhook",
    "/api/ping",
    "/favicon.ico",
    "/file.svg",
    "/globe.svg",
    "/grid.svg",
    "/logo.svg",
    "/next.svg",
    "/vercel.svg",
    "/window.svg",
  ];
  const publicPrefixes = ["/api/auth", "/_next", "/static", "/marketing"];

  if (
    publicPaths.includes(pathname) ||
    publicPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL("/auth/login", req.url);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
