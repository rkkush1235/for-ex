"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { MarketSnapshot } from "@/types";
import { formatCurrency, formatPercent, safeNumber } from "@/utils/format";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { usePlaceTrade, useTrades } from "@/hooks/useTrading";
import { getMarketStatus } from "@/utils/marketHours";

function normalizeSymbol(symbol: string) {
  return symbol.replace(/\//g, "").trim().toUpperCase();
}

function mapToTradingViewSymbol(symbol: string, category?: "forex" | "crypto" | "metal") {
  const clean = symbol.trim().toUpperCase();
  if (clean.includes(":")) return clean;

  const normalized = normalizeSymbol(clean);
  const known: Record<string, string> = {
    BTC: "BINANCE:BTCUSDT",
    ETH: "BINANCE:ETHUSDT",
    SOL: "BINANCE:SOLUSDT",
    BNB: "BINANCE:BNBUSDT",
    XRP: "BINANCE:XRPUSDT",
    DOGE: "BINANCE:DOGEUSDT",
    EURUSD: "FX:EURUSD",
    GBPUSD: "FX:GBPUSD",
    USDJPY: "FX:USDJPY",
    AUDUSD: "FX:AUDUSD",
    USDCAD: "FX:USDCAD",
    GOLD: "OANDA:XAUUSD",
    XAUUSD: "OANDA:XAUUSD",
    SILVER: "OANDA:XAGUSD",
    XAGUSD: "OANDA:XAGUSD",
  };

  if (known[normalized]) return known[normalized];
  if (category === "forex" && /^[A-Z]{6}$/.test(normalized)) return `FX:${normalized}`;
  if (category === "crypto") return `BINANCE:${normalized.endsWith("USDT") ? normalized : `${normalized}USDT`}`;
  if (category === "metal") return `OANDA:${normalized}`;
  return normalized;
}

interface DraftOrder {
  symbol: string;
  side: "buy" | "sell";
}

export function MarketCards({ snapshot }: { snapshot: MarketSnapshot }) {
  const { selectedSymbol, setSelectedSymbol, setSelectedOrderType } = useAppStore();
  const { appUser } = useAuth();
  const trades = useTrades(appUser?.uid);
  const placeTrade = usePlaceTrade();
  const rows = Object.values(snapshot.prices);
  // Fix: cards must be ready only on USD feed values.
  const ready = rows.some((item) => safeNumber(item.priceUsd) > 0);
  const [draftOrder, setDraftOrder] = useState<DraftOrder | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState(false);

  const holdingQty = useMemo(() => {
    if (!draftOrder) return 0;
    const userOpenTrades = trades.filter(
      (trade) => trade.asset === draftOrder.symbol && trade.status === "open",
    );
    const buyQty = userOpenTrades
      .filter((trade) => trade.type === "buy")
      .reduce((acc, trade) => acc + trade.quantity, 0);
    const sellQty = userOpenTrades
      .filter((trade) => trade.type === "sell")
      .reduce((acc, trade) => acc + trade.quantity, 0);
    return Math.max(0, buyQty - sellQty);
  }, [draftOrder, trades]);

  const draftPrice = draftOrder
    ? safeNumber(snapshot.prices[draftOrder.symbol]?.priceUsd)
    : 0;
  const estimated = safeNumber(Math.max(0, draftPrice * safeNumber(quantity, 0, 1e6)));

  const tvSymbol = useMemo(() => {
    if (!draftOrder) return "";
    const category = snapshot.prices[draftOrder.symbol]?.category;
    return mapToTradingViewSymbol(draftOrder.symbol, category);
  }, [draftOrder, snapshot.prices]);

  const draftMarketStatus = useMemo(() => {
    if (!draftOrder) return null;
    const category = snapshot.prices[draftOrder.symbol]?.category;
    if (!category) return null;
    return getMarketStatus(category);
  }, [draftOrder, snapshot.prices]);

  const openOrderModal = (symbol: string, side: "buy" | "sell") => {
    setSelectedSymbol(symbol);
    setSelectedOrderType(side);
    setOrderError(null);
    setQuantity(1);
    setDraftOrder({ symbol, side });
  };

  const submitOrder = async () => {
    if (!appUser?.uid || !draftOrder) return;
    setOrderError(null);

    try {
      setConfirmingOrder(true);
      await Promise.all([
        placeTrade.mutateAsync({
          userId: appUser.uid,
          asset: draftOrder.symbol,
          type: draftOrder.side,
          quantity,
        }),
        new Promise((resolve) => setTimeout(resolve, 1400)),
      ]);
      setDraftOrder(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to place order";
      setOrderError(message);
    } finally {
      setConfirmingOrder(false);
    }
  };

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
        const selected = selectedSymbol === item.symbol;
        const status = getMarketStatus(item.category);
        return (
          <motion.div
            key={item.symbol}
            whileHover={{ y: -2 }}
            onClick={() => setSelectedSymbol(item.symbol)}
            className={`glass p-4 text-left transition ${
              selected ? "ring-1 ring-emerald-500/80" : ""
            }`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            <p className="text-xs text-zinc-400">{item.symbol}</p>
            <h3 className="mt-2 text-lg font-semibold">{formatCurrency(safeNumber(item.priceUsd))}</h3>
            <p className={`mt-1 text-xs ${up ? "badge-up" : "badge-down"}`}>
              {formatPercent(safeNumber(item.change24h))}
            </p>
            {!status.isOpen ? (
              <p className="mt-1 text-[11px] text-red-400">Market Closed</p>
            ) : null}

            {selected ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openOrderModal(item.symbol, "buy");
                  }}
                  className="flex-1 rounded-md bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-zinc-900"
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openOrderModal(item.symbol, "sell");
                  }}
                  className="flex-1 rounded-md bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  SELL
                </button>
              </div>
            ) : null}
          </motion.div>
        );
      })}

      {draftOrder ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="glass w-full max-w-xl space-y-3 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {draftOrder.side.toUpperCase()} {draftOrder.symbol}
              </h4>
              <button
                type="button"
                onClick={() => setDraftOrder(null)}
                className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
              >
                Close
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-700/70 bg-zinc-950">
              <iframe
                key={tvSymbol}
                src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=15&theme=dark&style=1&locale=en&timezone=Asia%2FKolkata&hide_top_toolbar=1&hide_legend=1&withdateranges=0&saveimage=0&hideideas=1`}
                title={`${draftOrder.symbol} quick chart`}
                className="h-40 w-full"
                loading="lazy"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <p className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
                LTP: {draftPrice > 0 ? formatCurrency(draftPrice) : "--"}
              </p>
              <p className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
                Holding: {holdingQty.toFixed(4)}
              </p>
              <p className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
                Value: {formatCurrency(estimated)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 0)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
              />
              <button
                type="button"
                disabled={confirmingOrder || draftMarketStatus?.isOpen === false}
                onClick={submitOrder}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  draftOrder.side === "buy"
                    ? "bg-emerald-500 text-zinc-900"
                    : "bg-red-500 text-white"
                } disabled:opacity-60`}
              >
                {draftMarketStatus?.isOpen === false
                  ? "Market Closed"
                  : confirmingOrder
                  ? "Placing..."
                  : draftOrder.side === "buy"
                    ? "Confirm Buy"
                    : "Confirm Sell"}
              </button>
            </div>

            {draftMarketStatus && !draftMarketStatus.isOpen ? (
              <p className="text-xs text-red-400">{draftMarketStatus.message}</p>
            ) : null}
            {orderError ? <p className="text-xs text-red-400">{orderError}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
