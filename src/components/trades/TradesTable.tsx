"use client";

import { useMemo, useState } from "react";
import { Trade } from "@/types";
import { formatCurrency, safeNumber } from "@/utils/format";

function todayInputDate() {
  return toInputDate(Date.now());
}

function toInputDate(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TradesTable({
  trades,
  onClose,
  priceMap,
}: {
  trades: Trade[];
  onClose?: (trade: Trade) => void;
  priceMap?: Record<string, { priceUsd?: number }>;
}) {
  const [startDate, setStartDate] = useState(todayInputDate);
  const [endDate, setEndDate] = useState(todayInputDate);
  const [assetFilter, setAssetFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "sell">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

  const assetOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const trade of trades) {
      unique.add(trade.asset);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [trades]);

  const visibleTrades = useMemo(() => {
    const from = startDate && endDate && startDate > endDate ? endDate : startDate;
    const to = startDate && endDate && startDate > endDate ? startDate : endDate;

    return trades.filter((trade) => {
      const tradeDate = toInputDate(trade.timestamp);

      if (from && tradeDate < from) return false;
      if (to && tradeDate > to) return false;
      if (assetFilter !== "all" && trade.asset !== assetFilter) return false;
      if (typeFilter !== "all" && trade.type !== typeFilter) return false;
      if (statusFilter !== "all" && trade.status !== statusFilter) return false;

      return true;
    });
  }, [assetFilter, endDate, startDate, statusFilter, trades, typeFilter]);

  return (
    <div className="glass overflow-x-auto">
      <div className="grid gap-2 border-b border-zinc-800/80 p-3 md:grid-cols-5">
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900/70 px-2 py-1.5 text-xs"
          aria-label="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900/70 px-2 py-1.5 text-xs"
          aria-label="End date"
        />
        <select
          value={assetFilter}
          onChange={(event) => setAssetFilter(event.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900/70 px-2 py-1.5 text-xs"
          aria-label="Script filter"
        >
          <option value="all">All Scripts</option>
          {assetOptions.map((asset) => (
            <option key={asset} value={asset}>
              {asset}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as "all" | "buy" | "sell")}
          className="rounded-md border border-zinc-700 bg-zinc-900/70 px-2 py-1.5 text-xs"
          aria-label="Type filter"
        >
          <option value="all">All Types</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | "open" | "closed")}
          className="rounded-md border border-zinc-700 bg-zinc-900/70 px-2 py-1.5 text-xs"
          aria-label="Status filter"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs text-zinc-400">
          <tr>
            <th className="p-3">Asset</th>
            <th className="p-3">Type</th>
            <th className="p-3">Qty</th>
            <th className="p-3">Entry</th>
            <th className="p-3">Current</th>
            <th className="p-3">PnL</th>
            <th className="p-3">Status</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {visibleTrades.map((trade) => {
            const open = trade.status === "open";
            // Fix: current and entry must use same USD source for accurate PnL.
            const currentPrice = open
              ? safeNumber(priceMap?.[trade.asset]?.priceUsd ?? trade.currentPrice)
              : safeNumber(trade.currentPrice);
            const entryPrice = safeNumber(trade.entryPrice);
            const qty = safeNumber(trade.quantity, 0, 1e6);

            // Fix: canonical formula -> PnL = (currentPrice - entryPrice) * quantity.
            const basePnl = safeNumber((currentPrice - entryPrice) * qty, 0, 1e12);
            const livePnl =
              trade.type === "sell"
                ? safeNumber(-basePnl, 0, 1e12)
                : basePnl;

            return (
              <tr key={trade.id} className="border-t border-zinc-800/80">
                <td className="p-3">{trade.asset}</td>
                <td className="p-3 uppercase text-zinc-300">{trade.type}</td>
                <td className="p-3">{qty.toFixed(4)}</td>
                <td className="p-3">{formatCurrency(entryPrice)}</td>
                <td className="p-3">{formatCurrency(currentPrice)}</td>
                <td className={`p-3 ${livePnl >= 0 ? "badge-up" : "badge-down"}`}>
                  {formatCurrency(livePnl)}
                </td>
                <td className="p-3 capitalize text-zinc-300">{trade.status}</td>
                <td className="p-3">
                  {open ? (
                    <button
                      type="button"
                      onClick={() => onClose?.(trade)}
                      className="rounded-md bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700"
                    >
                      {trade.type === "sell" ? "Cover" : "Close"}
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-500">Closed</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
