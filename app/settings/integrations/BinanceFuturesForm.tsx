// app/settings/integrations/BinanceFuturesForm.tsx
"use client";

import { FormEvent, useState } from "react";

type Props = {
  connected: boolean;
  existingLabel: string | null;
};

export default function BinanceFuturesForm({ connected, existingLabel }: Props) {
  const [label, setLabel] = useState(existingLabel ?? "Binance Futures");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/integrations/binance-futures/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          apiKey,
          apiSecret,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        setStatus("error");
        setMessage(
          data?.message ||
            data?.error ||
            `Request failed with status ${res.status}`
        );
        return;
      }

      setStatus("success");
      setMessage("Binance Futures connected successfully.");
      setApiKey("");
      setApiSecret("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  const disabled = status === "loading";

  return (
    <form onSubmit={onSubmit} className="space-y-4 border border-zinc-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold">Binance Futures</h2>

      <p className="text-xs text-zinc-500">
        Paste an API key with <span className="font-semibold">read-only</span>{" "}
        permissions for **Futures**. Trading permissions are not required for
        the journal.
      </p>

      <div className="space-y-1">
        <label className="block text-xs text-zinc-400">Connection name</label>
        <input
          className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Binance Futures"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs text-zinc-400">API Key</label>
        <input
          className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Your Binance API key"
          autoComplete="off"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs text-zinc-400">API Secret</label>
        <input
          className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
          type="password"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          placeholder="Your Binance API secret"
          autoComplete="off"
        />
      </div>

      {connected && (
        <p className="text-xs text-emerald-500">
          Status: Binance Futures is currently <strong>connected</strong>. You can
          update the key by submitting this form again.
        </p>
      )}

      {message && (
        <p
          className={`text-xs ${
            status === "success" ? "text-emerald-500" : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
      >
        {status === "loading"
          ? "Connecting…"
          : connected
          ? "Update connection"
          : "Connect Binance Futures"}
      </button>
    </form>
  );
}
