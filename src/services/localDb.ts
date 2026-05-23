import { DepositRequest, Trade, Transaction, Wallet, WithdrawalRequest } from "@/types";

interface LocalDbState {
  wallets: Record<string, Wallet>;
  trades: Trade[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  transactions: Transaction[];
}

const STORAGE_KEY = "tradehub_local_db_v1";
const listeners = new Set<() => void>();
let cache: LocalDbState | null = null;

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
    cache = {
      wallets: parsed.wallets ?? {},
      trades: parsed.trades ?? [],
      deposits: parsed.deposits ?? [],
      withdrawals: parsed.withdrawals ?? [],
      transactions: parsed.transactions ?? [],
    };
    return cache;
  } catch {
    cache = defaultState();
    return cache;
  }
}

function persist(state: LocalDbState) {
  cache = state;
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
