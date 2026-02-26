"use client";

type Day = { day: number; pnl: number; trades: number };

const ENTRY_BG = "rgb(134, 136, 5)"; // journal highlight
const GREEN_BG = "rgba(34,197,94,0.32)"; // pnl win
const RED_BG = "rgba(249, 3, 3, 0.28)"; // pnl loss
const NEUTRAL_BG = "rgba(24,24,27,0.9)";

export default function CalendarPreview({
  days,
  title,
  year,
  month, // 0..11
  onPrevMonth,
  onNextMonth,
  className = "",

  // optional
  mode = "pnl",
  selectedDay,
  onSelectDay,
}: {
  days: Day[];
  title?: string;
  year: number;
  month: number; // 0..11
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  className?: string;

  mode?: "pnl" | "count";
  selectedDay?: number;
  onSelectDay?: (day: number) => void;
}) {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // First day offset (Mon=0..Sun=6)
  const first = new Date(Date.UTC(year, month, 1));
  const weekdayIdx = (first.getUTCDay() + 6) % 7;
  const blanks = Array.from({ length: weekdayIdx }, (_, i) => i);

  const legend =
    mode === "pnl" ? (
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
    ) : (
      <div className="flex items-center gap-3 text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <i
            className="h-3 w-3 rounded-sm inline-block"
            style={{ backgroundColor: ENTRY_BG }}
          />
          Entry
        </span>
      </div>
    );

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

        {legend}
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
          const hasTrades = d.trades > 0;
          const isWin = d.pnl > 0;
          const isLoss = d.pnl < 0;

          let bg = NEUTRAL_BG;

          if (mode === "pnl") {
            if (hasTrades && isWin) bg = GREEN_BG;
            if (hasTrades && isLoss) bg = RED_BG;
          } else {
            // mode === "count": highlight any day with entries
            if (hasTrades) bg = ENTRY_BG;
          }

          const active = selectedDay === d.day;

          return (
            <div
              key={d.day}
              className={[
                "rounded-md border p-2 flex flex-col justify-between h-20 transition",
                active
                  ? "border-emerald-300/70 ring-2 ring-emerald-400/30"
                  : "border-white/10",
                onSelectDay ? "cursor-pointer hover:brightness-110" : "",
              ].join(" ")}
              style={{ backgroundColor: bg }}
              onClick={() => onSelectDay?.(d.day)}
              role={onSelectDay ? "button" : undefined}
              aria-label={onSelectDay ? `Select day ${d.day}` : undefined}
              tabIndex={onSelectDay ? 0 : undefined}
              onKeyDown={(e) => {
                if (!onSelectDay) return;
                if (e.key === "Enter" || e.key === " ") onSelectDay(d.day);
              }}
            >
              {/* day number */}
              <div className="text-zinc-200">{d.day}</div>

              {/* middle line:
                  - pnl mode: show pnl
                  - count mode: KEEP SPACE but do NOT show the count number (avoid "duplicate")
               */}
              <div
                className={
                  mode === "pnl"
                    ? hasTrades
                      ? "font-semibold text-white"
                      : "font-semibold text-transparent"
                    : "font-semibold text-transparent"
                }
              >
                {mode === "pnl"
                  ? hasTrades
                    ? `${d.pnl > 0 ? "+" : ""}${d.pnl.toFixed(2)}`
                    : "0.00"
                  : "—"}
              </div>

              {/* bottom line */}
              <div
                className={
                  hasTrades
                    ? "text-[10px] text-zinc-300"
                    : "text-[10px] text-transparent"
                }
              >
                {hasTrades
                  ? mode === "pnl"
                    ? `${d.trades} ${d.trades === 1 ? "trade" : "trades"}`
                    : `${d.trades} ${d.trades === 1 ? "entry" : "entries"}`
                  : mode === "pnl"
                  ? "0 trades"
                  : "0 entries"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}