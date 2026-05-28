import { safeNumber } from "@/utils/format";

export function calculateExposure(userMargin: number, leverage: number) {
  const margin = safeNumber(userMargin, 0, 1e12);
  const lev = Math.max(1, safeNumber(leverage, 1, 300));
  return safeNumber(margin * lev, 0, 1e15);
}

export function calculateQuantity(exposure: number, currentMarketPrice: number) {
  const price = safeNumber(currentMarketPrice, 0, 1e12);
  if (price <= 0) return 0;
  return safeNumber(exposure / price, 0, 1e12);
}

export function calculateRequiredMargin(quantity: number, currentMarketPrice: number, leverage: number) {
  const qty = safeNumber(quantity, 0, 1e9);
  const price = safeNumber(currentMarketPrice, 0, 1e12);
  const lev = Math.max(1, safeNumber(leverage, 1, 300));
  return safeNumber((qty * price) / lev, 0, 1e12);
}

export function calculatePnL(input: {
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  side: "buy" | "sell";
}) {
  const entry = safeNumber(input.entryPrice, 0, 1e12);
  const current = safeNumber(input.currentPrice, 0, 1e12);
  const qty = safeNumber(input.quantity, 0, 1e9);
  const base = safeNumber((current - entry) * qty, 0, 1e12);
  return input.side === "sell" ? safeNumber(-base, 0, 1e12) : base;
}

export function getRiskLevel(leverage: number) {
  const lev = Math.max(1, safeNumber(leverage, 1, 300));
  if (lev <= 30) return "Low" as const;
  if (lev <= 100) return "Medium" as const;
  return "High" as const;
}
