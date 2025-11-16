"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/* ------------ Types shared with the server page ------------ */

type ApiKeyStatus = "active" | "revoked";

export type KeySummary = {
  id: string;
  label: string | null;
  keyLast4: string;
  status: ApiKeyStatus;
};

/* ------------ AddBinanceForm ------------ */

export function AddBinanceForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch(
          "/api/integrations/binance-futures/connect",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: label.trim() || null,
              apiKey: apiKey.trim(),
              secret: secret.trim(),
            }),
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(
            typeof data?.error === "string"
              ? data.error
              : "Failed to connect Binance. Please check the keys and try again."
          );
          return;
        }

        setSuccess("Binance Futures API key connected successfully.");
        setLabel("");
        setApiKey("");
        setSecret("");

        // Refresh server data so the new key appears in the list
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Unexpected error while connecting Binance.");
      }
    });
  }

  const disabled =
    isPending || !apiKey.trim() || !secret.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 max-w-md"
    >
      <div className="space-y-1">
        <label className="block text-sm text-zinc-300">
          Label (optional)
        </label>
        <input
          className="w-full rounded bg-zinc-900/70 border border-zinc-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          placeholder="Main Binance account"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm text-zinc-300">
          API Key
        </label>
        <input
          className="w-full rounded bg-zinc-900/70 border border-zinc-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm text-zinc-300">
          Secret Key
        </label>
        <input
          className="w-full rounded bg-zinc-900/70 border border-zinc-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-emerald-400">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center px-3 py-2 rounded bg-emerald-600 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Connecting..." : "Connect Binance Futures"}
      </button>
    </form>
  );
}

/* ------------ KeysList ------------ */

type KeysListProps = {
  keys: KeySummary[];
};

export function KeysList({ keys }: KeysListProps) {
  if (!keys.length) {
    return (
      <p className="text-sm text-zinc-500">
        No Binance keys added yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {keys.map((k) => (
        <li
          key={k.id}
          className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm"
        >
          <div>
            <div className="font-medium">
              {k.label || "Binance key"}
            </div>
            <div className="text-xs text-zinc-500">
              • Ending with <span className="font-mono">{k.keyLast4}</span>
            </div>
          </div>
          <span
            className={
              "text-xs px-2 py-1 rounded-full " +
              (k.status === "active"
                ? "bg-emerald-900/60 text-emerald-300"
                : "bg-zinc-800 text-zinc-400")
            }
          >
            {k.status === "active" ? "Active" : "Revoked"}
          </span>
        </li>
      ))}
    </ul>
  );
}
