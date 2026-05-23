import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { MARKET_SYMBOL_MAP, POLL_INTERVAL_MS, TRADED_ASSETS } from "@/utils/constants";
import { CandlePoint, MarketPrice, MarketSnapshot } from "@/types";

function isValidPrice(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function fetchUsdRate(base: string, quote: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.exchangerate.host/convert?from=${base}&to=${quote}`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const json = (await res.json()) as { result?: number };
      if (isValidPrice(json?.result)) return Number(json.result);
    }
  } catch {
    return 0;
  }

  const fallbackRes = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
    cache: "no-store",
  });
  if (!fallbackRes.ok) {
    throw new Error(`rate api failed: ${fallbackRes.status}`);
  }
  const fallbackJson = (await fallbackRes.json()) as { rates?: Record<string, number> };
  const rate = fallbackJson?.rates?.[quote];
  if (!isValidPrice(rate)) {
    throw new Error(`invalid rate for ${base}/${quote}`);
  }
  return Number(rate);
}

export async function fetchUsdInrRate(): Promise<number> {
  try {
    return await fetchUsdRate("USD", "INR");
  } catch {
    return 83;
  }
}

async function fetchCryptoPrices() {
  try {
    const ids = [
      MARKET_SYMBOL_MAP.BTC,
      MARKET_SYMBOL_MAP.ETH,
      MARKET_SYMBOL_MAP.SOL,
      MARKET_SYMBOL_MAP.BNB,
      MARKET_SYMBOL_MAP.XRP,
      MARKET_SYMBOL_MAP.DOGE,
    ].join(",");

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { cache: "no-store" },
    );

    if (!res.ok) throw new Error(`coingecko failed: ${res.status}`);

    const json = (await res.json()) as Record<string, { usd: number; usd_24h_change: number }>;
    if (!isValidPrice(json?.bitcoin?.usd)) {
      throw new Error("coingecko invalid payload");
    }
    return json;
  } catch {
    const [priceRes, statRes] = await Promise.all([
      fetch(
        "https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22BNBUSDT%22,%22XRPUSDT%22,%22DOGEUSDT%22%5D",
        { cache: "no-store" },
      ),
      fetch(
        "https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22BNBUSDT%22,%22XRPUSDT%22,%22DOGEUSDT%22%5D",
        { cache: "no-store" },
      ),
    ]);

    const prices = (await priceRes.json()) as Array<{ symbol: string; price: string }>;
    const stats = (await statRes.json()) as Array<{ symbol: string; priceChangePercent: string }>;

    const p = (symbol: string) => Number(prices.find((row) => row.symbol === symbol)?.price ?? 0);
    const c = (symbol: string) =>
      Number(stats.find((row) => row.symbol === symbol)?.priceChangePercent ?? 0);

    return {
      bitcoin: { usd: p("BTCUSDT"), usd_24h_change: c("BTCUSDT") },
      ethereum: { usd: p("ETHUSDT"), usd_24h_change: c("ETHUSDT") },
      solana: { usd: p("SOLUSDT"), usd_24h_change: c("SOLUSDT") },
      binancecoin: { usd: p("BNBUSDT"), usd_24h_change: c("BNBUSDT") },
      ripple: { usd: p("XRPUSDT"), usd_24h_change: c("XRPUSDT") },
      dogecoin: { usd: p("DOGEUSDT"), usd_24h_change: c("DOGEUSDT") },
    };
  }
}

async function fetchForexPrice(symbol: "EUR/USD" | "GBP/USD" | "USD/JPY" | "AUD/USD" | "USD/CAD") {
  try {
    const [base, quote] = symbol.split("/");
    const price = await fetchUsdRate(base, quote);
    return Number(price);
  } catch {
    return 0;
  }
}

async function fetchMetalPrice(symbol: "GOLD" | "SILVER") {
  try {
    const res = await fetch("https://api.metals.live/v1/spot", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as Array<Record<string, number>>;
      const row = json.find((item) => item.gold || item.silver);
      if (row) {
        if (symbol === "GOLD" && isValidPrice(row.gold)) return Number(row.gold);
        if (symbol === "SILVER" && isValidPrice(row.silver)) return Number(row.silver);
      }
    }
  } catch {
    return symbol === "GOLD" ? 2350 : 29;
  }

  return symbol === "GOLD" ? 2350 : 29;
}

async function upsertMinuteCandle(symbol: string, priceInr: number, nowMs: number) {
  const assetKey = symbol.replace("/", "_");
  const bucketTimeSec = Math.floor(nowMs / 60_000) * 60;
  const candleRef = doc(db, "marketPrices", "history", assetKey, String(bucketTimeSec));
  const snapshot = await getDoc(candleRef);

  if (!snapshot.exists()) {
    await setDoc(candleRef, {
      time: bucketTimeSec,
      open: priceInr,
      high: priceInr,
      low: priceInr,
      close: priceInr,
      updatedAt: nowMs,
    });
    return;
  }

  const prev = snapshot.data() as CandlePoint;
  await setDoc(
    candleRef,
    {
      time: bucketTimeSec,
      open: prev.open ?? priceInr,
      high: Math.max(prev.high ?? priceInr, priceInr),
      low: Math.min(prev.low ?? priceInr, priceInr),
      close: priceInr,
      updatedAt: nowMs,
    },
    { merge: true },
  );
}

async function buildLiveSnapshot(): Promise<MarketSnapshot> {
  const [usdInr, crypto, eurUsd, gbpUsd, usdJpy, audUsd, usdCad, gold, silver] = await Promise.all([
    fetchUsdInrRate(),
    fetchCryptoPrices(),
    fetchForexPrice("EUR/USD"),
    fetchForexPrice("GBP/USD"),
    fetchForexPrice("USD/JPY"),
    fetchForexPrice("AUD/USD"),
    fetchForexPrice("USD/CAD"),
    fetchMetalPrice("GOLD"),
    fetchMetalPrice("SILVER"),
  ]);

  const now = Date.now();

  const prices: Record<string, MarketPrice> = {
    "EUR/USD": {
      symbol: "EUR/USD",
      category: "forex",
      priceUsd: eurUsd,
      priceInr: eurUsd * usdInr,
      change24h: 0,
      updatedAt: now,
    },
    "GBP/USD": {
      symbol: "GBP/USD",
      category: "forex",
      priceUsd: gbpUsd,
      priceInr: gbpUsd * usdInr,
      change24h: 0,
      updatedAt: now,
    },
    "USD/JPY": {
      symbol: "USD/JPY",
      category: "forex",
      priceUsd: usdJpy,
      priceInr: usdJpy * usdInr,
      change24h: 0,
      updatedAt: now,
    },
    "AUD/USD": {
      symbol: "AUD/USD",
      category: "forex",
      priceUsd: audUsd,
      priceInr: audUsd * usdInr,
      change24h: 0,
      updatedAt: now,
    },
    "USD/CAD": {
      symbol: "USD/CAD",
      category: "forex",
      priceUsd: usdCad,
      priceInr: usdCad * usdInr,
      change24h: 0,
      updatedAt: now,
    },
    BTC: {
      symbol: "BTC",
      category: "crypto",
      priceUsd: crypto.bitcoin?.usd ?? 0,
      priceInr: (crypto.bitcoin?.usd ?? 0) * usdInr,
      change24h: crypto.bitcoin?.usd_24h_change ?? 0,
      updatedAt: now,
    },
    ETH: {
      symbol: "ETH",
      category: "crypto",
      priceUsd: crypto.ethereum?.usd ?? 0,
      priceInr: (crypto.ethereum?.usd ?? 0) * usdInr,
      change24h: crypto.ethereum?.usd_24h_change ?? 0,
      updatedAt: now,
    },
    SOL: {
      symbol: "SOL",
      category: "crypto",
      priceUsd: crypto.solana?.usd ?? 0,
      priceInr: (crypto.solana?.usd ?? 0) * usdInr,
      change24h: crypto.solana?.usd_24h_change ?? 0,
      updatedAt: now,
    },
    BNB: {
      symbol: "BNB",
      category: "crypto",
      priceUsd: crypto.binancecoin?.usd ?? 0,
      priceInr: (crypto.binancecoin?.usd ?? 0) * usdInr,
      change24h: crypto.binancecoin?.usd_24h_change ?? 0,
      updatedAt: now,
    },
    XRP: {
      symbol: "XRP",
      category: "crypto",
      priceUsd: crypto.ripple?.usd ?? 0,
      priceInr: (crypto.ripple?.usd ?? 0) * usdInr,
      change24h: crypto.ripple?.usd_24h_change ?? 0,
      updatedAt: now,
    },
    DOGE: {
      symbol: "DOGE",
      category: "crypto",
      priceUsd: crypto.dogecoin?.usd ?? 0,
      priceInr: (crypto.dogecoin?.usd ?? 0) * usdInr,
      change24h: crypto.dogecoin?.usd_24h_change ?? 0,
      updatedAt: now,
    },
    GOLD: {
      symbol: "GOLD",
      category: "metal",
      priceUsd: gold,
      priceInr: gold * usdInr,
      change24h: 0,
      updatedAt: now,
    },
    SILVER: {
      symbol: "SILVER",
      category: "metal",
      priceUsd: silver,
      priceInr: silver * usdInr,
      change24h: 0,
      updatedAt: now,
    },
  };

  return {
    prices,
    usdInr,
    updatedAt: now,
    source: "polling",
  };
}

export async function fetchLiveMarketSnapshot(): Promise<MarketSnapshot> {
  return buildLiveSnapshot();
}

export async function pollAndStoreMarketPrices(): Promise<MarketSnapshot> {
  const payload = await buildLiveSnapshot();
  const now = payload.updatedAt;

  await setDoc(doc(db, "marketPrices", "latest"), payload, { merge: true });
  await Promise.all(
    Object.values(payload.prices).map((row) => upsertMinuteCandle(row.symbol, row.priceInr, now)),
  );
  return payload;
}

export function startMarketPolling(userId: string, isAdmin: boolean, onError?: (error: unknown) => void) {
  let mounted = true;
  const lockRef = doc(db, "system", "marketPoller");

  const claimLock = async () => {
    if (!isAdmin) return false;

    try {
      const now = Date.now();
      const ok = await runTransaction(db, async (tx) => {
        const snap = await tx.get(lockRef);
        const data = snap.data() as { ownerId?: string; heartbeat?: number } | undefined;
        const stale = !data?.heartbeat || now - data.heartbeat > 15_000;
        const isOwner = data?.ownerId === userId;
        if (stale || isOwner) {
          tx.set(lockRef, { ownerId: userId, heartbeat: now }, { merge: true });
          return true;
        }
        return false;
      });
      return ok;
    } catch {
      return false;
    }
  };

  const tick = async () => {
    if (!mounted) return;
    try {
      const hasLock = await claimLock();
      if (!hasLock) return;
      await pollAndStoreMarketPrices();
      await setDoc(lockRef, { ownerId: userId, heartbeat: Date.now() }, { merge: true });
    } catch (error) {
      onError?.(error);
    }
  };

  tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);

  return () => {
    mounted = false;
    clearInterval(interval);
  };
}

export function subscribeMarketSnapshot(
  onData: (snap: MarketSnapshot) => void,
  onError?: (error: unknown) => void,
) {
  return onSnapshot(
    doc(db, "marketPrices", "latest"),
    (snapshot) => {
      const data = snapshot.data();
      if (data) onData(data as MarketSnapshot);
    },
    (error) => onError?.(error),
  );
}

export function subscribeHistoricalCandles(
  asset: string,
  onData: (rows: CandlePoint[]) => void,
  maxRows = 240,
  onError?: (error: unknown) => void,
) {
  const candlesRef = collection(db, "marketPrices", "history", asset.replace("/", "_"));
  const candlesQuery = query(candlesRef, orderBy("time", "desc"), limit(maxRows));

  return onSnapshot(
    candlesQuery,
    (snapshot) => {
      const rows = snapshot.docs
        .map((d) => d.data() as CandlePoint)
        .sort((a, b) => a.time - b.time);
      onData(rows);
    },
    (error) => onError?.(error),
  );
}

export function emptySnapshot(): MarketSnapshot {
  const now = Date.now();
  const prices = Object.fromEntries(
    TRADED_ASSETS.map((symbol) => [
      symbol,
      {
        symbol,
        category:
          symbol === "BTC" ||
          symbol === "ETH" ||
          symbol === "SOL" ||
          symbol === "BNB" ||
          symbol === "XRP" ||
          symbol === "DOGE"
            ? "crypto"
            : symbol === "GOLD" || symbol === "SILVER"
              ? "metal"
              : "forex",
        priceUsd: 0,
        priceInr: 0,
        change24h: 0,
        updatedAt: now,
      } as MarketPrice,
    ]),
  );

  return { prices, usdInr: 83, updatedAt: now, source: "polling" };
}
