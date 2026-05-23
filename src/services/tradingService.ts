import { getCurrentMarketSnapshot, refreshMarketSnapshot } from "@/services/marketFeed";
import { newId, readLocalDb, subscribeLocalDb, writeLocalDb } from "@/services/localDb";
import { Trade, Wallet } from "@/types";

async function latestPrice(asset: string) {
  const cached = getCurrentMarketSnapshot();
  const cachedPrice = cached.prices[asset]?.priceInr ?? 0;
  if (cachedPrice > 0) return cachedPrice;

  const refreshed = await refreshMarketSnapshot();
  return refreshed.prices[asset]?.priceInr ?? 0;
}

export async function ensureWallet(userId: string): Promise<Wallet> {
  const current = readLocalDb();
  const existing = current.wallets[userId];
  if (!existing) {
    const wallet: Wallet = {
      userId,
      balance: 100_000,
      locked: 0,
      updatedAt: Date.now(),
    };
    writeLocalDb((prev) => ({
      ...prev,
      wallets: {
        ...prev.wallets,
        [userId]: wallet,
      },
    }));
    return wallet;
  }

  return existing;
}

export function subscribeWallet(userId: string, onData: (wallet: Wallet) => void) {
  const emit = () => {
    const wallet = readLocalDb().wallets[userId];
    if (wallet) onData(wallet);
  };
  emit();
  return subscribeLocalDb(() => {
    emit();
  });
}

export function subscribeTrades(userId: string, onData: (trades: Trade[]) => void) {
  const emit = () => {
    const rows = readLocalDb()
      .trades
      .filter((trade) => trade.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);
    onData(rows);
  };
  emit();
  return subscribeLocalDb(() => {
    emit();
  });
}

export function subscribeAllTrades(onData: (trades: Trade[]) => void) {
  const emit = () => {
    const rows = [...readLocalDb().trades].sort((a, b) => b.timestamp - a.timestamp);
    onData(rows);
  };
  emit();
  return subscribeLocalDb(() => {
    emit();
  });
}

export async function placeTrade(input: {
  userId: string;
  asset: string;
  type: "buy" | "sell";
  quantity: number;
}) {
  const { userId, asset, type, quantity } = input;
  const currentPrice = await latestPrice(asset);
  const wallet = await ensureWallet(userId);
  const required = quantity * currentPrice;

  if (wallet.balance < required) {
    throw new Error("Insufficient wallet balance");
  }

  const now = Date.now();

  writeLocalDb((prev) => {
    const baseWallet = prev.wallets[userId] ?? wallet;
    const nextWallet: Wallet = {
      ...baseWallet,
      balance: baseWallet.balance - required,
      locked: baseWallet.locked + required,
      updatedAt: now,
    };

    const nextTrade: Trade = {
      id: newId("trade"),
      userId,
      asset,
      type,
      quantity,
      entryPrice: currentPrice,
      currentPrice,
      pnl: 0,
      status: "open",
      timestamp: now,
    };

    return {
      ...prev,
      wallets: {
        ...prev.wallets,
        [userId]: nextWallet,
      },
      trades: [nextTrade, ...prev.trades],
    };
  });
}

export async function closeTrade(trade: Trade) {
  const currentPrice = await latestPrice(trade.asset);
  const pnlPerUnit =
    trade.type === "buy"
      ? currentPrice - trade.entryPrice
      : trade.entryPrice - currentPrice;

  const pnl = pnlPerUnit * trade.quantity;
  const principal = trade.entryPrice * trade.quantity;

  const now = Date.now();

  writeLocalDb((prev) => {
    const existingWallet = prev.wallets[trade.userId] ?? {
      userId: trade.userId,
      balance: 100_000,
      locked: 0,
      updatedAt: now,
    };

    const nextWallet: Wallet = {
      ...existingWallet,
      balance: existingWallet.balance + principal + pnl,
      locked: Math.max(0, existingWallet.locked - principal),
      updatedAt: now,
    };

    const nextTrades = prev.trades.map((row) =>
      row.id === trade.id
        ? {
            ...row,
            currentPrice,
            pnl,
            status: "closed" as const,
            closedAt: now,
          }
        : row,
    );

    return {
      ...prev,
      wallets: {
        ...prev.wallets,
        [trade.userId]: nextWallet,
      },
      trades: nextTrades,
    };
  });
}
