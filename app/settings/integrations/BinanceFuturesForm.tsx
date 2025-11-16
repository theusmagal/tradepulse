// app/settings/integrations/BinanceFuturesForm.tsx
"use client";

import { useState, type FormEvent } from "react";

type ApiKeyRow = {
  id: string;
  label: string | null;
  keyLast4: string;
  status: string;
};

type KeysListProps = {
  keys: ApiKeyRow[];
};

export function AddBinanceForm() {
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/integrations/binance-futures/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, apiKey, secret }),
      });

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Failed to save key";

        setError(message);
      } else {
        setSuccess("Key connected successfully.");
        setLabel("");
        setApiKey("");
        setSecret("");
      }
    } catch {
      setError("Network error while connecting key");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400">Label</label>
        <input
          className="bg-zinc-900/60 rounded px-2 py-1 text-sm border border-zinc-800"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="My Binance futures key"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400">API Key</label>
        <input
          className="bg-zinc-900/60 rounded px-2 py-1 text-sm border border-zinc-800"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400">Secret</label>
        <input
          className="bg-zinc-900/60 rounded px-2 py-1 text-sm border border-zinc-800"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          required
          type="password"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-emerald-500">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="px-3 py-2 rounded bg-emerald-600 text-sm text-white disabled:opacity-60"
      >
        {loading ? "Connecting..." : "Connect key"}
      </button>
    </form>
  );
}

export function KeysList({ keys }: KeysListProps) {
  if (!keys.length) {
    return (
      <p className="text-xs text-zinc-500">
        You haven&apos;t connected any Binance keys yet.
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-sm">
      {keys.map((k) => (
        <li
          key={k.id}
          className="flex items-center justify-between border border-zinc-800/80 rounded px-2 py-1"
        >
          <div>
            <div>{k.label || "Untitled key"}</div>
            <div className="text-xs text-zinc-500">•••• {k.keyLast4}</div>
          </div>
          <span className="text-xs text-zinc-400 uppercase">
            {k.status === "active" ? "Active" : k.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
