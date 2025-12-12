"use client";
import { DownloadCloud, LineChart, CalendarDays, ShieldCheck } from "lucide-react";

type Feature = {
  title: string;
  desc: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const items: Feature[] = [
  {
    title: "Auto-import trades",
    desc: "Automatically import executions and funding from major exchanges.",
    Icon: DownloadCloud,
  },
  {
    title: "Performance KPIs",
    desc: "Win rate, profit factor, equity curve, avg win/loss, and more.",
    Icon: LineChart,
  },
  {
    title: "PnL Calendar",
    desc: "Daily wins/losses and trade counts in a simple month view.",
    Icon: CalendarDays,
  },
  {
    title: "Security-first",
    desc: "Encrypted API keys at rest and privacy by default.",
    Icon: ShieldCheck,
  },
];

export default function Features() {
  return (
    <section className="py-12 md:py-16 bg-transparent">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-2xl md:text-3xl font-semibold text-zinc-100">
          Everything you need to improve
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {items.map(({ title, desc, Icon }) => (
            <div key={title} className="glass p-5">
              <div className="flex items-start gap-3">
                {/* icon badge */}
                <span
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl
                             border border-zinc-700/50 bg-zinc-900/60"
                >
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400" />
                  <Icon className="h-5 w-5 text-zinc-200" strokeWidth={1.8} />
                </span>

                <div>
                  <h3 className="font-semibold text-zinc-100">{title}</h3>
                  <p className="mt-1 text-sm text-zinc-300">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
