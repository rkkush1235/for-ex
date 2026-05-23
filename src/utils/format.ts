export const formatCurrency = (value: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 2 : 4,
  }).format(Number.isFinite(value) ? value : 0);

export const formatPercent = (value: number) => `${value.toFixed(2)}%`;

export const cn = (...classes: Array<string | undefined | false | null>) =>
  classes.filter(Boolean).join(" ");
