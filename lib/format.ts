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
