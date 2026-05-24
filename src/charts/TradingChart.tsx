"use client";

import { useMemo } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency, formatPercent } from "@/utils/format";

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

  if (category === "forex" && /^[A-Z]{6}$/.test(normalized)) {
    return `FX:${normalized}`;
  }

  if (category === "metal") {
    if (normalized.includes("XAU")) return "OANDA:XAUUSD";
    if (normalized.includes("XAG")) return "OANDA:XAGUSD";
    return `OANDA:${normalized}`;
  }

  if (category === "crypto") {
    if (normalized.endsWith("USDT")) return `BINANCE:${normalized}`;
    return `BINANCE:${normalized}USDT`;
  }

  if (/^[A-Z]{6}$/.test(normalized)) return `FX:${normalized}`;
  if (normalized.endsWith("USDT")) return `BINANCE:${normalized}`;
  if (/^[A-Z]{2,10}$/.test(normalized)) return `NASDAQ:${normalized}`;
  return normalized;
}

export function TradingChart() {
  const { selectedSymbol } = useAppStore();
  const snapshot = useMarketData();

  const effectiveSymbol = useMemo(() => {
    const selectedPrice = snapshot.prices[selectedSymbol]?.priceUsd ?? snapshot.prices[selectedSymbol]?.priceInr ?? 0;
    if (selectedPrice > 0) return selectedSymbol;
    const fallback = Object.values(snapshot.prices).find((item) => (item.priceUsd ?? item.priceInr) > 0);
    return fallback?.symbol ?? selectedSymbol;
  }, [snapshot.prices, selectedSymbol]);

  const category = snapshot.prices[effectiveSymbol]?.category;
  const cardPriceInr = snapshot.prices[effectiveSymbol]?.priceUsd ?? snapshot.prices[effectiveSymbol]?.priceInr ?? 0;
  const cardChange = snapshot.prices[effectiveSymbol]?.change24h ?? 0;
  const tvSymbol = mapToTradingViewSymbol(effectiveSymbol, category);

  const embedSrc = useMemo(() => {
    const params = new URLSearchParams({
      symbol: tvSymbol,
      interval: "15",
      theme: "dark",
      style: "1",
      locale: "en",
      timezone: "Asia/Kolkata",
      hide_top_toolbar: "0",
      hide_legend: "0",
      withdateranges: "1",
      saveimage: "0",
      hideideas: "1",
      toolbarbg: "#0f1422",
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tvSymbol]);

  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{effectiveSymbol} TradingView Chart</h3>
          <p className="text-xs text-zinc-400">{tvSymbol}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-zinc-100">
            {cardPriceInr > 0 ? formatCurrency(cardPriceInr) : "--"}
          </p>
          <p className={`text-xs ${cardChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatPercent(cardChange)}
          </p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-700/70 bg-zinc-950">
        <iframe
          key={tvSymbol}
          src={embedSrc}
          title={`${effectiveSymbol} tradingview chart`}
          className="h-[360px] w-full md:h-[460px]"
          allow="clipboard-write; fullscreen"
          loading="lazy"
        />
      </div>
    </div>
  );
}
