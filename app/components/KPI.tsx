export default function KPI({
  label,
  value,
  sub,
  delta,
  positive,
  negative,
}: {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number;
  positive?: boolean;
  negative?: boolean;
}) {
  const badge =
    delta === undefined
      ? null
      : delta === 0
      ? <span className="rounded bg-zinc-800/60 px-2 py-0.5 text-xs">0</span>
      : (
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              delta > 0
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-red-500/15 text-red-300"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(2)}
          </span>
        );

  const color = positive
    ? "text-emerald-400"
    : negative
      ? "text-red-400"
      : "text-zinc-200";

  return (
    <div className="glass p-4">
      <div className="flex items-baseline gap-2">
        <div className={`text-2xl font-semibold ${color}`}>
          {value}
        </div>
        {badge}
      </div>
      <div className="text-sm text-zinc-400">
        {label}
        {sub ? ` • ${sub}` : ""}
      </div>
    </div>
  );
}
