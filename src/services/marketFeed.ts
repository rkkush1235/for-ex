import { fetchLiveMarketSnapshot, emptySnapshot } from "@/services/marketService";
import { MarketSnapshot } from "@/types";
import { POLL_INTERVAL_MS } from "@/utils/constants";

type Listener = (snapshot: MarketSnapshot) => void;

let snapshotCache: MarketSnapshot = emptySnapshot();
let listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

async function pullSnapshot() {
  if (inFlight) return;
  inFlight = true;
  try {
    const live = await fetchLiveMarketSnapshot();
    snapshotCache = live;
    listeners.forEach((listener) => listener(snapshotCache));
  } catch {
    return;
  } finally {
    inFlight = false;
  }
}

function ensureFeedStarted() {
  if (timer) return;
  pullSnapshot();
  timer = setInterval(pullSnapshot, POLL_INTERVAL_MS);
}

function maybeStopFeed() {
  if (listeners.size > 0) return;
  if (!timer) return;
  clearInterval(timer);
  timer = null;
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
  await pullSnapshot();
  return snapshotCache;
}
