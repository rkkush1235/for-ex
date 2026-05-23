"use client";

import { motion } from "framer-motion";
import { MarketSnapshot } from "@/types";
import { formatCurrency, formatPercent } from "@/utils/format";
import { useAppStore } from "@/store/useAppStore";

export function MarketCards({ snapshot }: { snapshot: MarketSnapshot }) {
  const { selectedSymbol, setSelectedSymbol } = useAppStore();
  const rows = Object.values(snapshot.prices);
  const ready = rows.some((item) => item.priceInr > 0);

  if (!ready) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="glass p-4">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton mt-3 h-7 w-28 rounded" />
            <div className="skeleton mt-2 h-3 w-12 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map((item, idx) => {
        const up = item.change24h >= 0;
        return (
          <motion.button
            key={item.symbol}
            type="button"
            whileHover={{ y: -2 }}
            onClick={() => setSelectedSymbol(item.symbol)}
            className={`glass p-4 text-left transition ${
              selectedSymbol === item.symbol ? "ring-1 ring-emerald-500/80" : ""
            }`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            <p className="text-xs text-zinc-400">{item.symbol}</p>
            <h3 className="mt-2 text-lg font-semibold">{formatCurrency(item.priceInr)}</h3>
            <p className={`mt-1 text-xs ${up ? "badge-up" : "badge-down"}`}>
              {formatPercent(item.change24h)}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}
