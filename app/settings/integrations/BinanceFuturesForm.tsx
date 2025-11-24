// app/settings/integrations/BinanceFuturesForm.tsx
"use client";

import { useState, type FormEvent } from "react";

type ImportResponse = {
  ok?: boolean;
  imported?: number;
  error?: string;
};

export function AddBinanceForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    if (!file) {
      setStatus("Please choose a CSV file first.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/binance-futures", {
        method: "POST",
        body: formData,
      });

      const data = (await res
        .json()
        .catch(() => null)) as ImportResponse | null;

      if (!res.ok) {
        const msg =
          data && data.error
            ? data.error
            : "Import failed.";
        setStatus(`Error: ${msg}`);
      } else {
        const imported = data?.imported ?? 0;
        setStatus(`Imported ${imported} trades successfully.`);
        setFile(null); // this is enough, the label will show "No file selected"
      }
    } catch {
      setStatus("Network error while uploading CSV.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      {/* Step 1: choose file */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-400 font-semibold">
          Step 1 – Choose your Binance Futures CSV file
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="binance-csv"
            name="binance-csv"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setStatus(null);
            }}
          />
          <label
            htmlFor="binance-csv"
            className="cursor-pointer inline-flex items-center rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-700 transition-colors"
          >
            Choose CSV file
          </label>

          <span className="text-xs text-zinc-300">
            {file ? file.name : "No file selected"}
          </span>
        </div>
      </div>

      {/* Step 2: import */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-400 font-semibold">
          Step 2 – Import into TradePulse
        </p>
        <button
          type="submit"
          disabled={loading || !file}
          className="inline-flex items-center rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Importing…" : "Import Binance Futures CSV"}
        </button>
      </div>

      {status && <p className="text-xs text-zinc-300">{status}</p>}

      <p className="text-[10px] text-zinc-500">
        How to get the CSV: In Binance, open{" "}
        <span className="font-semibold">
          Futures &gt; Trade / Transaction History
        </span>
        , choose a date range, export as CSV, then upload the file here.
      </p>
    </form>
  );
}
