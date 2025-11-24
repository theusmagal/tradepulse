// app/binance/import/page.tsx
"use client";

import { useState } from "react";

export default function BinanceFuturesImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setStatus("Please select a CSV file first.");
      return;
    }

    setStatus(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import/binance-futures", {
        method: "POST",
        body: formData,
      });

      const data: any = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          data && typeof data.error === "string"
            ? data.error
            : "Import failed.";
        setStatus(`Error: ${message}`);
      } else {
        setStatus(`Imported ${data.imported ?? 0} trades successfully.`);
      }
    } catch (err) {
      setStatus("Network error while uploading CSV.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">
          Import Binance Futures trades
        </h1>
        <p className="text-sm text-zinc-400">
          Export your trade history from Binance Futures as a CSV file and
          upload it here. We&apos;ll store the executions and update your
          dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-400">CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setStatus(null);
            }}
            className="text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="px-3 py-2 rounded bg-emerald-600 text-sm text-white disabled:opacity-60"
        >
          {loading ? "Importing..." : "Import CSV"}
        </button>
      </form>

      {status && <p className="text-sm">{status}</p>}

      <div className="text-xs text-zinc-500 border-t border-zinc-800 pt-4">
        <p className="font-semibold mb-1">How to export from Binance</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Open Binance on web.</li>
          <li>Go to Futures &gt; Transaction History / Trade History.</li>
          <li>Choose a date range and click Export as CSV.</li>
          <li>Upload the CSV file on this page.</li>
        </ol>
      </div>
    </div>
  );
}
