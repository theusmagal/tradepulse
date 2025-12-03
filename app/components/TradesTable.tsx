"use client";

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { fmtQty, pnlClass } from "@/lib/format";

type Trade = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: string;
  price: string;
  pnl: number;
  time: string; // ISO
};

type ColKey = "time" | "symbol" | "side" | "qty" | "price" | "pnl";

export default function TradesTable({
  rows: initialRows,
  timeZone,
}: {
  rows: Trade[];
  timeZone?: string;
}) {
  const [sortBy, setSortBy] = useState<ColKey>("time");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // We now ONLY use the rows that come from /api/me/summary
  const rows: Trade[] = initialRows;

  const tz = useMemo(
    () => timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [timeZone]
  );

  const dtFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      }),
    [tz]
  );
  const fmtDateTime = (iso: string): string => dtFmt.format(new Date(iso));

  const sorted = useMemo(() => {
    const s = [...rows].sort((a, b) => {
      const va = keyVal(a, sortBy);
      const vb = keyVal(b, sortBy);
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
    return s;
  }, [rows, sortBy, asc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);
  const fillers = Math.max(0, pageSize - pageRows.length);

  const changeSort = (k: ColKey) => {
    if (sortBy === k) setAsc(!asc);
    else {
      setSortBy(k);
      setAsc(k === "symbol" || k === "side");
    }
    setPage(1);
  };

  const go = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  const ROW_H = 40;

  if (!rows.length) {
    return (
      <div className="glass p-4 self-start text-sm text-zinc-400">
        <div className="mb-1 font-medium">Closed trades</div>
        No trades to display yet.
      </div>
    );
  }

  return (
    <div className="glass p-4 overflow-x-auto self-start">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          Recent closed trades (PnL ≠ 0)
        </div>
        <div className="text-xs text-zinc-400">
          Page <span className="text-zinc-200">{safePage}</span> of{" "}
          <span className="text-zinc-200">{totalPages}</span>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-zinc-900/60 backdrop-blur text-left text-zinc-400">
          <tr>
            {header("Time", "time", sortBy, asc, changeSort)}
            {header("Symbol", "symbol", sortBy, asc, changeSort)}
            {header("Side", "side", sortBy, asc, changeSort)}
            {header("Qty", "qty", sortBy, asc, changeSort)}
            {header("Price", "price", sortBy, asc, changeSort)}
            {header("PnL ($)", "pnl", sortBy, asc, changeSort)}
          </tr>
        </thead>

        <tbody>
          {pageRows.map((t) => (
            <tr key={t.id} className="border-t border-white/10">
              <td
                className="pr-3"
                style={{ height: ROW_H, paddingTop: 8, paddingBottom: 8 }}
              >
                {fmtDateTime(t.time)}
              </td>
              <td
                className="pr-3"
                style={{ height: ROW_H, paddingTop: 8, paddingBottom: 8 }}
              >
                {t.symbol}
              </td>
              <td
                className={`pr-3 ${
                  t.side === "BUY" ? "text-emerald-300" : "text-red-300"
                }`}
                style={{ height: ROW_H, paddingTop: 8, paddingBottom: 8 }}
              >
                {t.side}
              </td>
              <td
                className="pr-3"
                style={{ height: ROW_H, paddingTop: 8, paddingBottom: 8 }}
              >
                {fmtQty(t.qty)}
              </td>
              <td
                className="pr-3"
                style={{ height: ROW_H, paddingTop: 8, paddingBottom: 8 }}
              >
                {Number(t.price).toFixed(2)}
              </td>
              <td
                className={`pr-3 ${pnlClass(t.pnl)}`}
                style={{ height: ROW_H, paddingTop: 8, paddingBottom: 8 }}
              >
                {t.pnl >= 0 ? "+" : ""}
                {t.pnl.toFixed(2)}
              </td>
            </tr>
          ))}

          {/* filler rows to keep table height constant when less than 10 rows */}
          {Array.from({ length: fillers }).map((_, i) => (
            <tr key={`filler-${i}`} className="border-t border-white/10">
              {Array.from({ length: 6 }).map((__, j) => (
                <td
                  key={j}
                  className="pr-3"
                  style={{ height: ROW_H, paddingTop: 8, paddingBottom: 8 }}
                >
                  <span className="opacity-0">—</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* pagination controls */}
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
        <span>
          Showing{" "}
          <span className="text-zinc-200">{sorted.length ? start + 1 : 0}</span>
          –
          <span className="text-zinc-200">
            {Math.min(start + pageSize, sorted.length)}
          </span>{" "}
          of <span className="text-zinc-200">{sorted.length}</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => go(1)}
            disabled={safePage === 1}
            className="px-2 py-1 rounded border border-zinc-800 disabled:opacity-40"
            aria-label="First page"
          >
            «
          </button>
          <button
            onClick={() => go(safePage - 1)}
            disabled={safePage === 1}
            className="px-2 py-1 rounded border border-zinc-800 disabled:opacity-40"
            aria-label="Previous page"
          >
            ‹
          </button>

          {pageButtons(safePage, totalPages).map((p) => (
            <button
              key={p}
              onClick={() => go(p)}
              className={[
                "px-2 py-1 rounded border",
                p === safePage
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 hover:bg-zinc-900/60",
              ].join(" ")}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => go(safePage + 1)}
            disabled={safePage === totalPages}
            className="px-2 py-1 rounded border border-zinc-800 disabled:opacity-40"
            aria-label="Next page"
          >
            ›
          </button>
          <button
            onClick={() => go(totalPages)}
            disabled={safePage === totalPages}
            className="px-2 py-1 rounded border border-zinc-800 disabled:opacity-40"
            aria-label="Last page"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}

function header(
  label: string,
  key: ColKey,
  sortBy: ColKey,
  asc: boolean,
  on: (k: ColKey) => void
): ReactElement {
  const active = key === sortBy;
  return (
    <th className="py-2 pr-3 cursor-pointer select-none" onClick={() => on(key)}>
      <span className={active ? "text-zinc-100" : ""}>{label}</span>
      {active && <span className="ml-1">{asc ? "▲" : "▼"}</span>}
    </th>
  );
}

function keyVal(t: Trade, k: ColKey): number | string {
  switch (k) {
    case "time":
      return +new Date(t.time); // numeric timestamp
    case "qty":
      return Number(t.qty);
    case "price":
      return Number(t.price);
    case "pnl":
      return t.pnl;
    case "symbol":
      return t.symbol;
    case "side":
      return t.side;
    default:
      return "";
  }
}

function pageButtons(current: number, total: number): number[] {
  const span = 7;
  const half = Math.floor(span / 2);
  let start = Math.max(1, current - half);
  if (start + span - 1 > total) start = Math.max(1, total - span + 1);
  return Array.from({ length: Math.min(span, total) }, (_, i) => start + i);
}
