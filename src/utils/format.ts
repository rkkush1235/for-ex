// Fix: sanitize every numeric value before display/math to avoid NaN/Infinity leaks.
export const safeNumber = (value: unknown, fallback = 0, maxAbs = 1e12) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  const bounded = Math.max(-maxAbs, Math.min(maxAbs, num));
  return Number.isFinite(bounded) ? bounded : fallback;
};

export const formatCurrency = (value: unknown, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(safeNumber(value));

export const formatPercent = (value: unknown) => `${safeNumber(value).toFixed(2)}%`;

export const cn = (...classes: Array<string | undefined | false | null>) =>
  classes.filter(Boolean).join(" ");
