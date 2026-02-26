// app/journal/JournalClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import CalendarPreview from "@/components/CalendarPreview";

type Entry = {
  id: string;
  title: string;
  content: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
};

type DayCell = { day: number; pnl: number; trades: number };

function ymFrom(year: number, month0: number) {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

function daysInMonthUTC(year: number, month0: number) {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function utcDayFromIso(iso: string) {
  const d = new Date(iso);
  return d.getUTCDate();
}

export default function JournalClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth()); // 0..11
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getUTCDate());

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);

  const [editing, setEditing] = useState<Entry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [entryDate, setEntryDate] = useState(() => {
    // YYYY-MM-DD for input[type=date]
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });

  const ym = useMemo(() => ymFrom(year, month), [year, month]);

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
    setSelectedDay(1); // reset to day 1 when changing month
  };

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ym });
      if (q.trim()) params.set("q", q.trim());
      const r = await fetch(`/api/me/journal?${params.toString()}`, { cache: "no-store" });
      const json = await r.json();
      setEntries(Array.isArray(json.entries) ? json.entries : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  const monthLabel = useMemo(() => {
    const d = new Date(Date.UTC(year, month, 1));
    return d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  }, [year, month]);

  // Group entries by UTC day number in the currently viewed month
  const entriesByDay = useMemo(() => {
    const map = new Map<number, Entry[]>();
    for (const e of entries) {
      const day = utcDayFromIso(e.entryDate);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    // keep newest first inside each day
    for (const [day, arr] of map) {
      arr.sort((a, b) => +new Date(b.entryDate) - +new Date(a.entryDate));
      map.set(day, arr);
    }
    return map;
  }, [entries]);

  const calendarDays: DayCell[] = useMemo(() => {
    const dim = daysInMonthUTC(year, month);
    return Array.from({ length: dim }, (_, i) => {
      const day = i + 1;
      const count = entriesByDay.get(day)?.length ?? 0;
      return { day, pnl: 0, trades: count }; // trades = entry count (CalendarPreview mode="count")
    });
  }, [year, month, entriesByDay]);

  const visibleEntries = useMemo(() => {
    if (!selectedDay) return entries;
    return entriesByDay.get(selectedDay) ?? [];
  }, [entries, entriesByDay, selectedDay]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setContent("");

    // default date = selected day in current month (UTC-ish)
    const d = new Date(Date.UTC(year, month, selectedDay ?? 1));
    setEntryDate(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
      ).padStart(2, "0")}`
    );

    setOpen(true);
  };

  const openEdit = (e: Entry) => {
    setEditing(e);
    setTitle(e.title || "");
    setContent(e.content || "");

    // convert ISO -> YYYY-MM-DD (local display)
    const d = new Date(e.entryDate);
    setEntryDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    );

    setOpen(true);
  };

  async function save() {
    const payload = {
      title: title.trim(),
      content: content.trim(),
      // store as ISO (date input is local date; simplest: new Date(dateString) produces local midnight)
      entryDate: entryDate ? new Date(entryDate).toISOString() : undefined,
    };

    if (!payload.content) return;

    setLoading(true);
    try {
      if (!editing) {
        await fetch("/api/me/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/me/journal/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setOpen(false);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    setLoading(true);
    try {
      await fetch(`/api/me/journal/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* top controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-zinc-300">
          {selectedDay
            ? `Showing entries for ${monthLabel} ${selectedDay}`
            : `Showing entries for ${monthLabel}`}
          {loading && <span className="ml-2 text-xs text-zinc-400">Loading…</span>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or content…"
            className="h-9 w-full sm:w-64 rounded-md border border-zinc-800 bg-zinc-950/40 px-3 text-sm text-zinc-200 placeholder:text-zinc-500"
          />
          <button
            onClick={load}
            className="h-9 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 text-sm text-zinc-200 hover:bg-zinc-900/60"
          >
            Search
          </button>
          <button
            onClick={openCreate}
            className="h-9 rounded-md bg-emerald-500 px-3 text-sm font-medium text-zinc-900 hover:bg-emerald-400"
          >
            New entry
          </button>
        </div>
      </div>

      {/* calendar + entries */}
      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        <div className="h-full">
          <CalendarPreview
            title="Journal"
            days={calendarDays}
            year={year}
            month={month}
            onPrevMonth={() => shiftMonth(-1)}
            onNextMonth={() => shiftMonth(+1)}
            mode="count"
            selectedDay={selectedDay ?? undefined}
            onSelectDay={(d) => setSelectedDay(d)}
          />
        </div>

        <div className="h-full space-y-4">
          {visibleEntries.length === 0 ? (
            <div className="glass p-6 text-sm text-zinc-400">No entries for this day.</div>
          ) : (
            visibleEntries.map((e) => (
              <div key={e.id} className="glass p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-zinc-400">
                      {new Date(e.entryDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })}
                    </div>
                    <div className="mt-1 text-base font-semibold text-zinc-100">
                      {e.title || "Untitled"}
                    </div>
                    <div className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">
                      {e.content}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => openEdit(e)}
                      className="h-8 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 text-xs text-zinc-200 hover:bg-zinc-900/60"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(e.id)}
                      className="h-8 rounded-md border border-white/10 bg-zinc-900/40 px-3 text-xs text-red-300 hover:bg-zinc-900/60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-xl border border-white/10 bg-zinc-950/95 p-4 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-100">
                {editing ? "Edit entry" : "New entry"}
              </div>
              <button
                className="text-zinc-400 hover:text-zinc-200"
                onClick={() => !loading && setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-zinc-400">Date</div>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950/40 px-3 text-sm text-zinc-200"
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs text-zinc-400">Title (optional)</div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950/40 px-3 text-sm text-zinc-200"
                    placeholder="e.g. Broke rule after first loss"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs text-zinc-400">Entry</div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[180px] w-full rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200"
                  placeholder="What happened? What did you feel? What will you do differently next time?"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="h-9 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 text-sm text-zinc-200 hover:bg-zinc-900/60"
                  onClick={() => !loading && setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="h-9 rounded-md bg-emerald-500 px-3 text-sm font-medium text-zinc-900 hover:bg-emerald-400 disabled:opacity-60"
                  disabled={loading || !content.trim()}
                  onClick={save}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}