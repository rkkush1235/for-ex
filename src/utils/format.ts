export const formatCurrency = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export const formatPercent = (value: number) => `${value.toFixed(2)}%`;

export const cn = (...classes: Array<string | undefined | false | null>) =>
  classes.filter(Boolean).join(" ");
