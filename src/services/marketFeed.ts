import { emptySnapshot, fetchLiveForexPrices, fetchLiveMarketSnapshot } from "@/services/marketService";
import { MarketPrice, MarketSnapshot } from "@/types";
import { POLL_INTERVAL_MS } from "@/utils/constants";

type Listener = (snapshot: MarketSnapshot) => void;

let snapshotCache: MarketSnapshot = emptySnapshot();
let listeners = new Set<Listener>();
let forexTimer: ReturnType<typeof setInterval> | null = null;
let forexInFlight = false;
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let started = false;
let bootstrapped = false;

const BINANCE_FUTURES_STREAMS = [
  "btcusdt@ticker",
  "ethusdt@ticker",
  "bnbusdt@ticker",
  "xrpusdt@ticker",
  "dogeusdt@ticker",
  "solusdt@ticker",
  "xauusdt@ticker",
  "xagusdt@ticker",
] as const;

const BINANCE_COMBINED_STREAM_URL = `wss://fstream.binance.com/stream?streams=${BINANCE_FUTURES_STREAMS.join("/")}`;

const FUTURES_SYMBOL_TO_ASSET: Record<string, string> = {
  BTCUSDT: "BTC",
  ETHUSDT: "ETH",
  BNBUSDT: "BNB",
  XRPUSDT: "XRP",
  DOGEUSDT: "DOGE",
  SOLUSDT: "SOL",
  XAUUSDT: "GOLD",
  XAGUSDT: "SILVER",
};

function toFinitePositive(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return Number.NaN;
  return parsed;
}

function toFiniteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed;
}

function notifyListeners() {
  listeners.forEach((listener) => listener(snapshotCache));
}

function applyBinanceTickerUpdate(asset: string, lastPrice: number, changePercent: number) {
  const now = Date.now();
  const prev = snapshotCache.prices[asset];
  const category: MarketPrice["category"] = asset === "GOLD" || asset === "SILVER" ? "metal" : "crypto";
  const nextChange = Number.isFinite(changePercent) ? changePercent : (prev?.change24h ?? 0);

  snapshotCache = {
    ...snapshotCache,
    updatedAt: now,
    prices: {
      ...snapshotCache.prices,
      [asset]: {
        symbol: asset,
        category,
        priceUsd: lastPrice,
        priceInr: lastPrice,
        change24h: nextChange,
        updatedAt: now,
      },
    },
  };

  notifyListeners();
}

function handleBinanceMessage(raw: unknown) {
  if (typeof raw !== "string") return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("[MarketFeed] Binance WS invalid JSON payload");
    return;
  }

  const envelope = parsed as { data?: Record<string, unknown> };
  const data = envelope?.data;
  if (!data || typeof data !== "object") {
    console.warn("[MarketFeed] Binance WS payload missing ticker data");
    return;
  }

  const symbolRaw = data.s;
  const symbol = typeof symbolRaw === "string" ? symbolRaw.toUpperCase() : "";
  const asset = FUTURES_SYMBOL_TO_ASSET[symbol];
  if (!asset) return;

  const lastPrice = toFinitePositive(data.c);
  if (!Number.isFinite(lastPrice)) {
    console.warn("[MarketFeed] Binance WS invalid price", { symbol, payload: data });
    return;
  }

  const changePercent = toFiniteNumber(data.P);
  applyBinanceTickerUpdate(asset, lastPrice, changePercent);
}

function scheduleReconnect() {
  if (reconnectTimer || listeners.size === 0) return;

  const delay = Math.min(1_000 * 2 ** reconnectAttempts, 15_000);
  reconnectAttempts += 1;
  console.info("[MarketFeed] Binance WS reconnect scheduled", { delayMs: delay, attempt: reconnectAttempts });

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startBinanceStream();
  }, delay);
}

function clearReconnectTimer() {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function startBinanceStream() {
  if (typeof WebSocket === "undefined") {
    console.warn("[MarketFeed] WebSocket not available in current runtime");
    return;
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  console.info("[MarketFeed] Binance WS connecting", { url: BINANCE_COMBINED_STREAM_URL });
  const ws = new WebSocket(BINANCE_COMBINED_STREAM_URL);
  socket = ws;

  ws.onopen = () => {
    reconnectAttempts = 0;
    console.info("[MarketFeed] Binance WS connected");
  };

  ws.onmessage = (event) => {
    handleBinanceMessage(event.data);
  };

  ws.onerror = () => {
    console.warn("[MarketFeed] Binance WS error event received");
  };

  ws.onclose = (event) => {
    if (socket === ws) socket = null;
    console.warn("[MarketFeed] Binance WS closed", { code: event.code, reason: event.reason });
    if (!started || listeners.size === 0) return;
    scheduleReconnect();
  };
}

function stopBinanceStream() {
  clearReconnectTimer();
  reconnectAttempts = 0;

  if (!socket) return;
  try {
    socket.close();
  } catch {
    return;
  } finally {
    socket = null;
    console.info("[MarketFeed] Binance WS cleaned up");
  }
}

async function pollForexSnapshot() {
  if (forexInFlight) return;
  forexInFlight = true;

  try {
    const live = await fetchLiveForexPrices(snapshotCache);
    snapshotCache = {
      ...snapshotCache,
      updatedAt: Math.max(snapshotCache.updatedAt, live.updatedAt),
      prices: {
        ...snapshotCache.prices,
        ...live.prices,
      },
    };
    notifyListeners();
  } catch {
    console.warn("[MarketFeed] Forex polling failed");
  } finally {
    forexInFlight = false;
  }
}

async function bootstrapSnapshotOnce() {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    const live = await fetchLiveMarketSnapshot();
    snapshotCache = live;
    notifyListeners();
  } catch {
    console.warn("[MarketFeed] Initial market snapshot bootstrap failed");
  }
}

function ensureFeedStarted() {
  if (started) return;
  started = true;

  void bootstrapSnapshotOnce();
  startBinanceStream();
  void pollForexSnapshot();
  forexTimer = setInterval(pollForexSnapshot, POLL_INTERVAL_MS);
}

function maybeStopFeed() {
  if (listeners.size > 0) return;
  started = false;

  if (forexTimer) {
    clearInterval(forexTimer);
    forexTimer = null;
  }

  stopBinanceStream();
}

export function subscribeMarketFeed(listener: Listener) {
  listeners.add(listener);
  listener(snapshotCache);
  ensureFeedStarted();

  return () => {
    listeners.delete(listener);
    maybeStopFeed();
  };
}

export function getCurrentMarketSnapshot() {
  return snapshotCache;
}

export async function refreshMarketSnapshot() {
  await pollForexSnapshot();
  return snapshotCache;
}
