import { DepositRequest, Trade, Transaction, Wallet, WithdrawalRequest } from "@/types";

interface LocalDbState {
  wallets: Record<string, Wallet>;
  trades: Trade[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  transactions: Transaction[];
}

const STORAGE_KEY = "tradehub_local_db_v1";
const ORDER_TTL_MS = 24 * 60 * 60 * 1000;
const listeners = new Set<() => void>();
let cache: LocalDbState | null = null;

function pruneExpiredOrders(state: LocalDbState): LocalDbState {
  const cutoff = Date.now() - ORDER_TTL_MS;
  const expired = state.trades.filter((trade) => trade.timestamp < cutoff);
  if (!expired.length) return state;

  const activeTrades = state.trades.filter((trade) => trade.timestamp >= cutoff);
  const wallets = { ...state.wallets };

  expired.forEach((trade) => {
    if (trade.status !== "open") return;
    const wallet = wallets[trade.userId];
    if (!wallet) return;
    const principal = trade.entryPrice * trade.quantity;
    wallets[trade.userId] = {
      ...wallet,
      balance: wallet.balance + principal,
      locked: Math.max(0, wallet.locked - principal),
      updatedAt: Date.now(),
    };
  });

  return {
    ...state,
    wallets,
    trades: activeTrades,
  };
}

function defaultState(): LocalDbState {
  return {
    wallets: {},
    trades: [],
    deposits: [],
    withdrawals: [],
    transactions: [],
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadState(): LocalDbState {
  if (cache) return cache;
  if (!canUseStorage()) {
    cache = defaultState();
    return cache;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    cache = defaultState();
    return cache;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalDbState>;
    cache = pruneExpiredOrders({
      wallets: parsed.wallets ?? {},
      trades: parsed.trades ?? [],
      deposits: parsed.deposits ?? [],
      withdrawals: parsed.withdrawals ?? [],
      transactions: parsed.transactions ?? [],
    });
    return cache;
  } catch {
    cache = defaultState();
    return cache;
  }
}

function persist(state: LocalDbState) {
  const next = pruneExpiredOrders(state);
  cache = next;
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  listeners.forEach((listener) => listener());
}

export function readLocalDb(): LocalDbState {
  return loadState();
}

export function writeLocalDb(updater: (prev: LocalDbState) => LocalDbState) {
  const current = loadState();
  const next = updater(current);
  persist(next);
}

export function subscribeLocalDb(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
