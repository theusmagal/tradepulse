import Container from "./Container";
import Image from "next/image";

export default function HeroPro() {
  return (
    <section className="pt-16 md:pt-24 bg-transparent">
      <Container className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <span
            className="inline-block rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider
                       text-emerald-300 bg-emerald-400/10 ring-1 ring-emerald-400/30"
          >
            New • Trading journal for pros
          </span>

          <h1
            className="mt-5 text-4xl md:text-5xl font-semibold leading-tight text-zinc-100 tracking-tight"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,.35)" }}
          >
            Trade smarter. <span className="text-emerald-400">Not harder.</span>
          </h1>

          <p className="mt-4 text-zinc-300">
            Connect your exchange and get instant analytics — KPIs, equity curve, and a PnL
            calendar. No spreadsheets. No manual entry.
          </p>

          <div className="mt-8 flex items-center gap-3">
            {/* Pass default plan so we auto-checkout after sign-up */}
            <a
              href="/pricing"
              className="rounded-md px-5 py-3 font-medium
                         bg-emerald-500 text-zinc-900 hover:bg-emerald-400
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70
                         shadow-[0_0_20px_rgba(16,185,129,.18)] hover:shadow-[0_0_26px_rgba(16,185,129,.24)] transition"
            >
              Start free trial
            </a>
            <a
              href="/pricing"
              className="rounded-md px-5 py-3 border border-zinc-700/70 text-zinc-200
                         hover:bg-zinc-900/60
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 transition"
            >
              See pricing
            </a>
          </div>

          <ul className="mt-5 grid gap-2 text-sm text-zinc-300">
            <li className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                ✓
              </span>
              Auto-import trades from major exchanges
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                ✓
              </span>
              KPI dashboard & equity curve
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                ✓
              </span>
              PnL calendar with daily trade counts
            </li>
          </ul>

          <p className="mt-3 text-xs text-zinc-400">14-day free trial • Cancel anytime</p>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="absolute -top-10 -right-8 -z-10 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl md:h-80 md:w-80"
          />
          <div className="glass p-3">
            <Image
              src="/marketing/grafico.png"
              alt="TradePulse dashboard preview"
              width={950}
              height={614}
              priority
              className="h-auto w-full rounded-xl border border-white/10"
              sizes="(min-width: 768px) 540px, 100vw"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div className="glass p-3 text-center">
              <div className="text-lg font-semibold text-emerald-300">+12%</div>
              <div className="text-zinc-400">MoM PnL</div>
            </div>
            <div className="glass p-3 text-center">
              <div className="text-lg font-semibold text-emerald-300">58%</div>
              <div className="text-zinc-400">Win rate</div>
            </div>
            <div className="glass p-3 text-center">
              <div className="text-lg font-semibold text-emerald-300">1.8</div>
              <div className="text-zinc-400">Profit factor</div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
