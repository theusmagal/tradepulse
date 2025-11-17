// app/settings/Integrations.tsx
"use client";

import { useState } from "react";

type PlanStatus = "active" | "revoked";

type KeyRow = {
  id: string;
  label: string | null;
  keyLast4: string;
  status: PlanStatus;
};

type KeysListProps = {
  keys: KeyRow[];
};

export function KeysList({ keys }: KeysListProps) {
  if (!keys.length) {
    return (
      <p className="text-sm text-zinc-500">
        You have no Binance keys connected yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2 text-sm">
      {keys.map((k) => (
        <li
          key={k.id}
          className="flex items-center justify-between rounded border border-zinc-800 px-3 py-2"
        >
          <div>
            <div className="font-medium">
              {k.label || "Binance Futures"} ••••{k.keyLast4}
            </div>
            <div className="text-xs text-zinc-500">
              Status:{" "}
              <span
                className={
                  k.status === "active"
                    ? "text-emerald-500"
                    : "text-zinc-500 line-through"
                }
              >
                {k.status}
              </span>
            </div>
          </div>
          {/* Later we can add a "Revoke" button here */}
        </li>
      ))}
    </ul>
  );
}

type AddBinanceFormState =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "error"; message: string }
  | { state: "success" };

export function AddBinanceForm() {
  const [status, setStatus] = useState<AddBinanceFormState>({ state: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const apiKey = String(formData.get("apiKey") ?? "");
    const apiSecret = String(formData.get("apiSecret") ?? "");
    const label = String(formData.get("label") ?? "");

    if (!apiKey || !apiSecret) {
      setStatus({ state: "error", message: "API key and secret are required." });
      return;
    }

    setStatus({ state: "submitting" });

    try {
      const res = await fetch("/api/integrations/binance-futures/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret, label }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const msg =
          json?.error ??
          "Failed to connect Binance futures. Check key permissions.";
        setStatus({ state: "error", message: msg });
        return;
      }

      setStatus({ state: "success" });
      form.reset();
      // Let the user re-load the page to see the key list for now
    } catch (err) {
      console.error(err);
      setStatus({
        state: "error",
        message: "Network error while connecting Binance futures.",
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-2">
        <label className="text-xs text-zinc-400">
          Label (optional)
          <input
            name="label"
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm"
            placeholder="e.g. Binance Futures #1"
          />
        </label>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="text-xs text-zinc-400">
          API Key
          <input
            name="apiKey"
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm"
            placeholder="Binance API key"
            autoComplete="off"
          />
        </label>
        <label className="text-xs text-zinc-400">
          Secret Key
          <input
            name="apiSecret"
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm"
            placeholder="Binance secret"
            autoComplete="off"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="inline-flex items-center rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {status.state === "submitting" ? "Connecting…" : "Connect Binance Futures"}
      </button>

      {status.state === "error" && (
        <p className="text-xs text-red-500">{status.message}</p>
      )}
      {status.state === "success" && (
        <p className="text-xs text-emerald-500">
          Binance futures key saved. Reload the page to see it in your list.
        </p>
      )}

      <p className="text-[10px] text-zinc-500">
        We only use read-only permissions. Keys are encrypted at rest using AES-256.
      </p>
    </form>
  );
}
