"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export function AddBybitForm() {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError("Unexpected error. Try again.");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-300">
          API Key
        </label>
        <input
          required
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-md bg-zinc-900/40 border border-zinc-700 p-2 text-sm"
          placeholder="Enter Bybit API Key"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-300">
          API Secret
        </label>
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
  );
}
