"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

export function AddBybitForm() {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setError(null);

    try {
      const res = await fetch("/api/integrations/bybit-futures/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to connect Bybit.");
      } else {
        setMsg("Bybit connected successfully!");
        setApiKey("");
        setApiSecret("");
      }
    } catch {
      setError("Unexpected error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncMsg(null);
    setSyncError(null);

    try {
      const res = await fetch("/api/me/bybit-futures/sync", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSyncError(json.error || "Failed to sync Bybit data.");
      } else {
        const imported = json.imported ?? 0;
        setSyncMsg(`Synced successfully. Imported ${imported} executions.`);
      }
    } catch {
      setSyncError("Unexpected error while syncing. Try again.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Connect form */}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-300">API Key</label>
          <input
            required
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-md bg-zinc-900/40 border border-zinc-700 p-2 text-sm"
            placeholder="Enter Bybit API Key"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-300">API Secret</label>
          <input
            required
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            className="w-full rounded-md bg-zinc-900/40 border border-zinc-700 p-2 text-sm"
            placeholder="Enter Bybit API Secret"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-9 px-4 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Connect Bybit
        </button>

        {msg && <p className="text-emerald-400 text-sm">{msg}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </form>

      {/* Manual sync section */}
      <div className="border-t border-zinc-800 pt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-400">
            Once connected, click below to sync your latest closed PnL from
            Bybit. Then refresh your dashboard to see the updated stats.
          </p>
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="h-8 px-3 rounded-md border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-1 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            {syncing && <Loader2 className="h-3 w-3 animate-spin" />}
            {!syncing && <RefreshCw className="h-3 w-3" />}
            Sync latest data
          </button>
        </div>

        {syncMsg && <p className="text-emerald-400 text-xs">{syncMsg}</p>}
        {syncError && <p className="text-red-400 text-xs">{syncError}</p>}
      </div>
    </div>
  );
}
