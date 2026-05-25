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
import { safeNumber } from "@/utils/format";
import { CandlePoint, MarketPrice, MarketSnapshot } from "@/types";

function isValidPrice(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseApiNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return Number.NaN;
}

// Fix: normalize unrealistic market values before storing/rendering.
function normalizeUsdPrice(symbol: string, raw: unknown) {
  const value = safeNumber(raw, 0, 1e9);
  const key = symbol.toUpperCase();

  const ranges: Record<string, { min: number; max: number }> = {
    BTC: { min: 10_000, max: 200_000 },
    ETH: { min: 100, max: 20_000 },
    SOL: { min: 1, max: 5_000 },
    BNB: { min: 10, max: 10_000 },
    XRP: { min: 0.01, max: 20 },
    DOGE: { min: 0.001, max: 5 },
    GOLD: { min: 1_000, max: 10_000 },
    SILVER: { min: 1, max: 1_000 },
    "EUR/USD": { min: 0.1, max: 5 },
    "GBP/USD": { min: 0.1, max: 5 },
    "USD/JPY": { min: 10, max: 500 },
    "AUD/USD": { min: 0.1, max: 5 },
    "USD/CAD": { min: 0.1, max: 5 },
  };

  const range = ranges[key];
  if (!range) return value;
  if (value < range.min || value > range.max) return 0;
  return value;
}

function deriveChange(current: unknown, previous?: unknown) {
  const curr = safeNumber(current);
  const prev = safeNumber(previous);
  if (curr <= 0 || prev <= 0) return 0;
  return safeNumber(((curr - prev) / prev) * 100, 0, 10_000);
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

    const p = (symbol: string) => parseApiNumber(prices.find((row) => row.symbol === symbol)?.price ?? 0);
    const c = (symbol: string) => parseApiNumber(stats.find((row) => row.symbol === symbol)?.priceChangePercent ?? 0);

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
    return normalizeUsdPrice(symbol, price);
  } catch {
    return 0;
  }
}

export async function fetchLiveForexPrices(previous?: MarketSnapshot) {
  const [eurUsd, gbpUsd, usdJpy, audUsd, usdCad] = await Promise.all([
    fetchForexPrice("EUR/USD"),
    fetchForexPrice("GBP/USD"),
    fetchForexPrice("USD/JPY"),
    fetchForexPrice("AUD/USD"),
    fetchForexPrice("USD/CAD"),
  ]);

  const now = Date.now();
  const previousPrices = previous?.prices ?? {};

  const pickLiveOrPrevious = (symbol: string, current: unknown, prev?: unknown) => {
    const next = normalizeUsdPrice(symbol, current);
    if (next > 0) return next;
    return normalizeUsdPrice(symbol, prev);
  };

  const eurUsdSafe = pickLiveOrPrevious("EUR/USD", eurUsd, previousPrices["EUR/USD"]?.priceUsd);
  const gbpUsdSafe = pickLiveOrPrevious("GBP/USD", gbpUsd, previousPrices["GBP/USD"]?.priceUsd);
  const usdJpySafe = pickLiveOrPrevious("USD/JPY", usdJpy, previousPrices["USD/JPY"]?.priceUsd);
  const audUsdSafe = pickLiveOrPrevious("AUD/USD", audUsd, previousPrices["AUD/USD"]?.priceUsd);
  const usdCadSafe = pickLiveOrPrevious("USD/CAD", usdCad, previousPrices["USD/CAD"]?.priceUsd);

  const prices: Record<string, MarketPrice> = {
    "EUR/USD": {
      symbol: "EUR/USD",
      category: "forex",
      priceUsd: eurUsdSafe,
      priceInr: eurUsdSafe,
      change24h: deriveChange(eurUsdSafe, previousPrices["EUR/USD"]?.priceUsd),
      updatedAt: now,
    },
    "GBP/USD": {
      symbol: "GBP/USD",
      category: "forex",
      priceUsd: gbpUsdSafe,
      priceInr: gbpUsdSafe,
      change24h: deriveChange(gbpUsdSafe, previousPrices["GBP/USD"]?.priceUsd),
      updatedAt: now,
    },
    "USD/JPY": {
      symbol: "USD/JPY",
      category: "forex",
      priceUsd: usdJpySafe,
      priceInr: usdJpySafe,
      change24h: deriveChange(usdJpySafe, previousPrices["USD/JPY"]?.priceUsd),
      updatedAt: now,
    },
    "AUD/USD": {
      symbol: "AUD/USD",
      category: "forex",
      priceUsd: audUsdSafe,
      priceInr: audUsdSafe,
      change24h: deriveChange(audUsdSafe, previousPrices["AUD/USD"]?.priceUsd),
      updatedAt: now,
    },
    "USD/CAD": {
      symbol: "USD/CAD",
      category: "forex",
      priceUsd: usdCadSafe,
      priceInr: usdCadSafe,
      change24h: deriveChange(usdCadSafe, previousPrices["USD/CAD"]?.priceUsd),
      updatedAt: now,
    },
  };

  return { prices, updatedAt: now };
}

async function fetchMetalPrice(symbol: "GOLD" | "SILVER") {
  const futuresSymbol = symbol === "GOLD" ? "XAUUSDT" : "XAGUSDT";

  try {
    const res = await fetch(
      `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${futuresSymbol}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`binance futures failed: ${res.status}`);

    const payload = (await res.json()) as { symbol?: string; price?: string };
    const parsed = parseApiNumber(payload.price);
    const normalized = normalizeUsdPrice(symbol, parsed);
    if (!isValidPrice(normalized)) {
      throw new Error(`invalid futures ${symbol} price`);
    }
    return normalized;
  } catch {
    return Number.NaN;
  }
}

async function upsertMinuteCandle(symbol: string, priceUsd: number, nowMs: number) {
  const assetKey = symbol.replace("/", "_");
  const bucketTimeSec = Math.floor(nowMs / 60_000) * 60;
  const candleRef = doc(db, "marketPrices", "history", assetKey, String(bucketTimeSec));
  const snapshot = await getDoc(candleRef);

  if (!snapshot.exists()) {
    await setDoc(candleRef, {
      time: bucketTimeSec,
      open: priceUsd,
      high: priceUsd,
      low: priceUsd,
      close: priceUsd,
      updatedAt: nowMs,
    });
    return;
  }

  const prev = snapshot.data() as CandlePoint;
  await setDoc(
    candleRef,
    {
      time: bucketTimeSec,
      open: prev.open ?? priceUsd,
      high: Math.max(prev.high ?? priceUsd, priceUsd),
      low: Math.min(prev.low ?? priceUsd, priceUsd),
      close: priceUsd,
      updatedAt: nowMs,
    },
    { merge: true },
  );
}

async function buildLiveSnapshot(): Promise<MarketSnapshot> {
  const [crypto, eurUsd, gbpUsd, usdJpy, audUsd, usdCad, gold, silver, previousSnapshot] = await Promise.all([
    fetchCryptoPrices(),
    fetchForexPrice("EUR/USD"),
    fetchForexPrice("GBP/USD"),
    fetchForexPrice("USD/JPY"),
    fetchForexPrice("AUD/USD"),
    fetchForexPrice("USD/CAD"),
    fetchMetalPrice("GOLD"),
    fetchMetalPrice("SILVER"),
    getDoc(doc(db, "marketPrices", "latest")),
  ]);

  const now = Date.now();
  const previous = previousSnapshot.data() as MarketSnapshot | undefined;
  const previousPrices = previous?.prices ?? {};

  const resolveMetalPrice = (symbol: "GOLD" | "SILVER", current: unknown, prev?: unknown) => {
    const normalizedCurrent = normalizeUsdPrice(symbol, current);
    if (isValidPrice(normalizedCurrent)) return normalizedCurrent;

    const normalizedPrevious = normalizeUsdPrice(symbol, prev);
    if (isValidPrice(normalizedPrevious)) return normalizedPrevious;

    throw new Error(`Live ${symbol} price unavailable`);
  };

  const pickLiveOrPrevious = (symbol: string, current: unknown, prev?: unknown) => {
    const next = normalizeUsdPrice(symbol, current);
    if (next > 0) return next;
    return normalizeUsdPrice(symbol, prev);
  };

  const eurUsdSafe = pickLiveOrPrevious("EUR/USD", eurUsd, previousPrices["EUR/USD"]?.priceUsd);
  const gbpUsdSafe = pickLiveOrPrevious("GBP/USD", gbpUsd, previousPrices["GBP/USD"]?.priceUsd);
  const usdJpySafe = pickLiveOrPrevious("USD/JPY", usdJpy, previousPrices["USD/JPY"]?.priceUsd);
  const audUsdSafe = pickLiveOrPrevious("AUD/USD", audUsd, previousPrices["AUD/USD"]?.priceUsd);
  const usdCadSafe = pickLiveOrPrevious("USD/CAD", usdCad, previousPrices["USD/CAD"]?.priceUsd);
  const btcSafe = pickLiveOrPrevious("BTC", crypto.bitcoin?.usd, previousPrices.BTC?.priceUsd);
  const ethSafe = pickLiveOrPrevious("ETH", crypto.ethereum?.usd, previousPrices.ETH?.priceUsd);
  const solSafe = pickLiveOrPrevious("SOL", crypto.solana?.usd, previousPrices.SOL?.priceUsd);
  const bnbSafe = pickLiveOrPrevious("BNB", crypto.binancecoin?.usd, previousPrices.BNB?.priceUsd);
  const xrpSafe = pickLiveOrPrevious("XRP", crypto.ripple?.usd, previousPrices.XRP?.priceUsd);
  const dogeSafe = pickLiveOrPrevious("DOGE", crypto.dogecoin?.usd, previousPrices.DOGE?.priceUsd);
  const goldSafe = resolveMetalPrice("GOLD", gold, previousPrices.GOLD?.priceUsd);
  const silverSafe = resolveMetalPrice("SILVER", silver, previousPrices.SILVER?.priceUsd);

  const prices: Record<string, MarketPrice> = {
    "EUR/USD": {
      symbol: "EUR/USD",
      category: "forex",
      priceUsd: eurUsdSafe,
      priceInr: eurUsdSafe,
      change24h: deriveChange(eurUsdSafe, previousPrices["EUR/USD"]?.priceUsd),
      updatedAt: now,
    },
    "GBP/USD": {
      symbol: "GBP/USD",
      category: "forex",
      priceUsd: gbpUsdSafe,
      priceInr: gbpUsdSafe,
      change24h: deriveChange(gbpUsdSafe, previousPrices["GBP/USD"]?.priceUsd),
      updatedAt: now,
    },
    "USD/JPY": {
      symbol: "USD/JPY",
      category: "forex",
      priceUsd: usdJpySafe,
      priceInr: usdJpySafe,
      change24h: deriveChange(usdJpySafe, previousPrices["USD/JPY"]?.priceUsd),
      updatedAt: now,
    },
    "AUD/USD": {
      symbol: "AUD/USD",
      category: "forex",
      priceUsd: audUsdSafe,
      priceInr: audUsdSafe,
      change24h: deriveChange(audUsdSafe, previousPrices["AUD/USD"]?.priceUsd),
      updatedAt: now,
    },
    "USD/CAD": {
      symbol: "USD/CAD",
      category: "forex",
      priceUsd: usdCadSafe,
      priceInr: usdCadSafe,
      change24h: deriveChange(usdCadSafe, previousPrices["USD/CAD"]?.priceUsd),
      updatedAt: now,
    },
    BTC: {
      symbol: "BTC",
      category: "crypto",
      priceUsd: btcSafe,
      priceInr: btcSafe,
      change24h: safeNumber(crypto.bitcoin?.usd_24h_change ?? deriveChange(btcSafe, previousPrices.BTC?.priceUsd)),
      updatedAt: now,
    },
    ETH: {
      symbol: "ETH",
      category: "crypto",
      priceUsd: ethSafe,
      priceInr: ethSafe,
      change24h: safeNumber(crypto.ethereum?.usd_24h_change ?? deriveChange(ethSafe, previousPrices.ETH?.priceUsd)),
      updatedAt: now,
    },
    SOL: {
      symbol: "SOL",
      category: "crypto",
      priceUsd: solSafe,
      priceInr: solSafe,
      change24h: safeNumber(crypto.solana?.usd_24h_change ?? deriveChange(solSafe, previousPrices.SOL?.priceUsd)),
      updatedAt: now,
    },
    BNB: {
      symbol: "BNB",
      category: "crypto",
      priceUsd: bnbSafe,
      priceInr: bnbSafe,
      change24h: safeNumber(crypto.binancecoin?.usd_24h_change ?? deriveChange(bnbSafe, previousPrices.BNB?.priceUsd)),
      updatedAt: now,
    },
    XRP: {
      symbol: "XRP",
      category: "crypto",
      priceUsd: xrpSafe,
      priceInr: xrpSafe,
      change24h: safeNumber(crypto.ripple?.usd_24h_change ?? deriveChange(xrpSafe, previousPrices.XRP?.priceUsd)),
      updatedAt: now,
    },
    DOGE: {
      symbol: "DOGE",
      category: "crypto",
      priceUsd: dogeSafe,
      priceInr: dogeSafe,
      change24h: safeNumber(crypto.dogecoin?.usd_24h_change ?? deriveChange(dogeSafe, previousPrices.DOGE?.priceUsd)),
      updatedAt: now,
    },
    GOLD: {
      symbol: "GOLD",
      category: "metal",
      priceUsd: goldSafe,
      priceInr: goldSafe,
      change24h: deriveChange(goldSafe, previousPrices.GOLD?.priceUsd),
      updatedAt: now,
    },
    SILVER: {
      symbol: "SILVER",
      category: "metal",
      priceUsd: silverSafe,
      priceInr: silverSafe,
      change24h: deriveChange(silverSafe, previousPrices.SILVER?.priceUsd),
      updatedAt: now,
    },
  };

  return {
    prices,
    usdInr: 1,
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
    Object.values(payload.prices).map((row) => upsertMinuteCandle(row.symbol, row.priceUsd, now)),
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
