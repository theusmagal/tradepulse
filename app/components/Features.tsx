"use client";
import { DownloadCloud, LineChart, CalendarDays, NotebookPen } from "lucide-react";

type Feature = {
  title: string;
  desc: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const items: Feature[] = [
  {
    title: "Import trades fast",
    desc: "Bybit syncs via read-only API. Binance imports instantly via CSV upload.",
    Icon: DownloadCloud,
  },
  {
    title: "Performance KPIs",
    desc: "Win rate, profit factor, average R, equity curve, and more—computed automatically.",
    Icon: LineChart,
  },
  {
    title: "PnL Calendar",
    desc: "Daily results and trade counts in a clean month view. Patterns jump out instantly.",
    Icon: CalendarDays,
  },
  {
    title: "Journal notes",
    desc: "Log what happened and why. Search entries by date to build discipline over time.",
    Icon: NotebookPen,
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