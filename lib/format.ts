
export const fmtUsd = (
  n: number,
  { signed = false }: { signed?: boolean } = {}
) => {
  const abs = Math.abs(n);

  const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(abs);

  if (!signed) {
    if (n < 0) return `-${usd}`;
    return usd;
  }

  if (n > 0) return `+${usd}`;
  if (n < 0) return `-${usd}`;
  return usd;
};


export const fmtPct = (n: number) => `${Math.round(n)}%`;

export const pnlClass = (n: number) =>
  n > 0 ? "text-emerald-300" : n < 0 ? "text-red-300" : "text-zinc-300";

export const fmtQty = (s: string | number) =>
  typeof s === "string" ? s : s.toFixed(3);

export const fmtDateTime = (
  iso: string,
  { locale = "en-GB", timeZone = "UTC" }: { locale?: string; timeZone?: string } = {}
) => {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  })
    .format(d)
    .replace(",", "");
};
