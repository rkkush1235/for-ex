"use client";

import { Trade } from "@/types";
import { formatCurrency } from "@/utils/format";

export function TradesTable({
  trades,
  onClose,
  priceMap,
}: {
  trades: Trade[];
  onClose?: (trade: Trade) => void;
  priceMap?: Record<string, { priceInr: number }>;
}) {
  return (
    <div className="glass overflow-x-auto">
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
          {trades.map((trade) => {
            const open = trade.status === "open";
            const currentPrice = open
              ? (priceMap?.[trade.asset]?.priceInr ?? trade.currentPrice)
              : trade.currentPrice;
            const pnlPerUnit =
              trade.type === "buy"
                ? currentPrice - trade.entryPrice
                : trade.entryPrice - currentPrice;
            const livePnl = open ? pnlPerUnit * trade.quantity : trade.pnl;

            return (
              <tr key={trade.id} className="border-t border-zinc-800/80">
                <td className="p-3">{trade.asset}</td>
                <td className="p-3 uppercase text-zinc-300">{trade.type}</td>
                <td className="p-3">{trade.quantity}</td>
                <td className="p-3">{formatCurrency(trade.entryPrice)}</td>
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
                      Close
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
