"use client";

type Day = { day: number; pnl: number; trades: number };

const GREEN_BG = "rgba(34,197,94,0.32)";
const RED_BG = "rgba(249, 3, 3, 0.28)";
const NEUTRAL_BG = "rgba(39,39,42,0.9)"; // softer grey

export default function CalendarPreview({
  days,
  title,
  year,
  month, // 0..11
  onPrevMonth,
  onNextMonth,
  className = "",
}: {
  days: Day[];
  title?: string;
  year: number;
  month: number; // 0..11
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  className?: string;
}) {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // First day offset (Mon=0..Sun=6)
  const first = new Date(Date.UTC(year, month, 1));
  const weekdayIdx = (first.getUTCDay() + 6) % 7;
  const blanks = Array.from({ length: weekdayIdx }, (_, i) => i);

  return (
    <div className={`glass p-4 space-y-3 h-full ${className}`}>
      {/* header with month nav */}
      <div className="flex items-center justify-between text-sm text-zinc-300">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevMonth}
            disabled={!onPrevMonth}
            className="h-7 w-7 rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-40"
            aria-label="Previous month"
          >
            ‹
          </button>
          <div className="px-2 font-medium">
            {title ??
              new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(Date.UTC(year, month, 1)))}
          </div>
          <button
            onClick={onNextMonth}
            disabled={!onNextMonth}
            className="h-7 w-7 rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-40"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-3 text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <i
              className="h-3 w-3 rounded-sm inline-block"
              style={{ backgroundColor: GREEN_BG }}
            />
            Win
          </span>
          <span className="inline-flex items-center gap-1">
            <i
              className="h-3 w-3 rounded-sm inline-block"
              style={{ backgroundColor: RED_BG }}
            />
            Loss
          </span>
        </div>
      </div>

      {/* body */}
      <div className="grid grid-cols-7 gap-2 text-xs">
        {weekdays.map((w) => (
          <div key={w} className="text-zinc-500 text-center">
            {w}
          </div>
        ))}

        {/* leading blanks */}
        {blanks.map((i) => (
          <div key={`b-${i}`} />
        ))}

        {/* days */}
        {days.map((d) => {
          const isPos = d.pnl > 0;
          const isNeg = d.pnl < 0;
          const isNoTrades = d.trades === 0;

          if (isNoTrades) {
            // neutral / empty day: just show date
            return (
              <div
                key={d.day}
                className="rounded-md border border-white/5 p-2 flex items-start"
                style={{ backgroundColor: NEUTRAL_BG }}
              >
                <div className="text-zinc-400 text-sm font-medium">
                  {d.day}
                </div>
              </div>
            );
          }

          const bg = isPos ? GREEN_BG : isNeg ? RED_BG : NEUTRAL_BG;
          const pnlClass = isPos
            ? "text-emerald-300"
            : isNeg
            ? "text-red-300"
            : "text-zinc-300";

          return (
            <div
              key={d.day}
              className="rounded-md border border-white/10 p-2 flex flex-col justify-between"
              style={{ backgroundColor: bg }}
            >
              <div className="flex items-center justify-between">
                <div className="text-zinc-200 text-sm font-medium">
                  {d.day}
                </div>
                <div className={`text-xs font-semibold ${pnlClass}`}>
                  {d.pnl > 0 && "+"}
                  {d.pnl.toFixed(2)}
                </div>
              </div>
              <div className="text-[10px] text-zinc-200 mt-1">
                {d.trades} {d.trades === 1 ? "trade" : "trades"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
