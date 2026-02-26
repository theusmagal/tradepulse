"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const authed = status === "authenticated";

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // close user dropdown on outside click / ESC
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setUserMenuOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/auth/login");
    router.refresh();
  }

  const linkBase =
    "transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-sm";
  const isActive = (href: string) => (pathname === href ? "text-emerald-300" : "text-zinc-200");

  const initials =
    (session?.user?.name?.trim() || session?.user?.email || "?")
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <header
      role="banner"
      className={[
        "sticky top-0 z-50 backdrop-blur-md supports-[backdrop-filter]:bg-transparent transition",
        scrolled
          ? "border-b border-white/10 bg-zinc-900/70 shadow-[0_0_25px_rgba(16,185,129,0.08)]"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2" aria-label="TradePulse home">
          <svg viewBox="0 0 64 24" className="h-4 md:h-5 w-auto pulse-ecg" aria-hidden="true">
            <path
              d="M1 12 H12 L16 6 L20 22 L26 2 L30 14 L34 10 L38 12 H63"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            className="text-lg font-semibold tracking-tight text-emerald-400"
            style={{ textShadow: "0 0 8px rgba(16,185,129,.4)" }}
          >
            TradePulse
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Primary">
          {!authed ? (
            <>
              <Link
                href="/pricing"
                aria-current={pathname === "/pricing" ? "page" : undefined}
                className={`${linkBase} ${isActive("/pricing")}`}
              >
                Pricing
              </Link>

              <Link href="/#features" className={`text-zinc-200 ${linkBase}`}>
                Features
              </Link>

              <Link
                href="/auth/login"
                aria-current={pathname === "/auth/login" ? "page" : undefined}
                className={`${linkBase} ${isActive("/auth/login")}`}
              >
                Login
              </Link>

              <Link
                href="/pricing"
                className="px-3 py-1.5 rounded-md bg-emerald-500 text-zinc-900 font-medium
                           hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-emerald-400/70"
              >
                Get started
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                aria-current={pathname === "/dashboard" ? "page" : undefined}
                className={`${linkBase} ${isActive("/dashboard")}`}
              >
                Dashboard
              </Link>

              <Link
                href="/journal"
                aria-current={pathname === "/journal" ? "page" : undefined}
                className={`${linkBase} ${isActive("/journal")}`}
              >
                Journal
              </Link>

              {/* User dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 px-2 py-1 hover:bg-zinc-900/80"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-200 text-xs font-semibold">
                    {initials}
                  </div>
                  <span className="hidden sm:block text-sm text-zinc-300">
                    {session?.user?.name || session?.user?.email}
                  </span>
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-zinc-950/95 shadow-xl backdrop-blur-md p-1"
                  >
                    <div className="px-3 py-2 text-xs text-zinc-400">
                      Signed in as
                      <br />
                      <span className="text-zinc-200">{session?.user?.email}</span>
                    </div>
                    <hr className="border-white/10 my-1" />
                    <Link
                      href="/settings/profile"
                      className="block rounded-md px-3 py-2 text-sm hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings/billing"
                      className="block rounded-md px-3 py-2 text-sm hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Billing
                    </Link>
                    <Link
                      href="/settings/integrations"
                      className="block rounded-md px-3 py-2 text-sm hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Integrations
                    </Link>
                    <hr className="border-white/10 my-1" />
                    <button
                      className="w-full text-left rounded-md px-3 py-2 text-sm text-red-300 hover:bg-white/5"
                      onClick={handleSignOut}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 md:hidden
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <div aria-hidden className="space-y-1.5">
            <div className="h-[2px] w-5 bg-zinc-200" />
            <div className="h-[2px] w-5 bg-zinc-200" />
            <div className="h-[2px] w-5 bg-zinc-200" />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/10 bg-zinc-900/70 backdrop-blur md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3 text-sm" aria-label="Mobile">
            {!authed ? (
              <>
                <Link
                  href="/pricing"
                  aria-current={pathname === "/pricing" ? "page" : undefined}
                  className={`${linkBase} ${isActive("/pricing")}`}
                >
                  Pricing
                </Link>
                <Link href="/#features" className={`text-zinc-200 ${linkBase}`}>
                  Features
                </Link>
                <Link
                  href="/auth/login"
                  aria-current={pathname === "/auth/login" ? "page" : undefined}
                  className={`${linkBase} ${isActive("/auth/login")}`}
                >
                  Login
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-md bg-emerald-500 px-3 py-2 text-center font-medium text-zinc-900
                             hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-emerald-400/70"
                >
                  Get started
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  aria-current={pathname === "/dashboard" ? "page" : undefined}
                  className={`${linkBase} ${isActive("/dashboard")}`}
                >
                  Dashboard
                </Link>

                <Link
                  href="/journal"
                  aria-current={pathname === "/journal" ? "page" : undefined}
                  className={`${linkBase} ${isActive("/journal")}`}
                >
                  Journal
                </Link>

                <Link href="/settings/profile" className={`${linkBase} text-zinc-200`}>
                  Profile
                </Link>
                <Link href="/settings/billing" className={`${linkBase} text-zinc-200`}>
                  Billing
                </Link>
                <Link href="/settings/integrations" className={`${linkBase} text-zinc-200`}>
                  Integrations
                </Link>

                <button
                  onClick={handleSignOut}
                  className="text-left text-zinc-200 hover:underline focus-visible:outline-none
                             focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-sm"
                  aria-label="Sign out"
                >
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}