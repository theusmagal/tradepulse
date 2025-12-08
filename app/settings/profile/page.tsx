// app/settings/profile/page.tsx
"use client";

import { useEffect, useState } from "react";

type SettingsResponse = {
  email: string;
  name: string;
  timezone: string;
  startingBalance: number;
};

export default function ProfileSettingsPage() {
  const [initial, setInitial] = useState<SettingsResponse | null>(null);

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [startingBalance, setStartingBalance] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load current settings
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/me/settings", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as SettingsResponse;
        if (cancelled) return;

        setInitial(json);
        setName(json.name ?? "");
        setTimezone(json.timezone ?? "UTC");
        setStartingBalance(json.startingBalance.toString());
      } catch {
        if (!cancelled) {
          setError("Failed to load profile settings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const sbNum = Number(startingBalance);
      const res = await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          timezone: timezone.trim(),
          startingBalance: Number.isFinite(sbNum) ? sbNum : 10000,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }

      const json = (await res.json()) as SettingsResponse;
      setInitial(json);
      setName(json.name ?? "");
      setTimezone(json.timezone ?? "UTC");
      setStartingBalance(json.startingBalance.toString());
      setMessage("Profile updated.");
    } catch (e: any) {
      setError(e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>

      <div className="glass p-4 space-y-4">
        {initial && (
          <p className="text-sm text-zinc-400">
            Logged in as{" "}
            <span className="text-zinc-200 font-medium">{initial.email}</span>
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              value={initial?.email ?? ""}
              readOnly
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-400"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Timezone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. Europe/Helsinki"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Used for displaying dates and times in your dashboard.
            </p>
          </div>

          {/* Starting balance */}
          <div>
            <label className="block text-sm text-zinc-300 mb-1">
              Starting balance (USD)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Used as the baseline for your equity curve.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-md bg-emerald-500/90 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            {message && (
              <span className="text-xs text-emerald-300">{message}</span>
            )}
            {error && <span className="text-xs text-red-400">{error}</span>}
            {loading && !error && (
              <span className="text-xs text-zinc-400">Loading…</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
