import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { getCurrentMarketSnapshot, refreshMarketSnapshot } from "@/services/marketFeed";
import { Trade, Wallet } from "@/types";
import { getMarketStatus, inferMarketCategory } from "@/utils/marketHours";

const usersCol = collection(db, "users");
const tradesCol = collection(db, "trades");
const transactionsCol = collection(db, "transactions");

async function latestPrice(asset: string) {
  const cached = getCurrentMarketSnapshot();
  const cachedPrice = cached.prices[asset]?.priceInr ?? 0;
  if (cachedPrice > 0) return cachedPrice;

  const refreshed = await refreshMarketSnapshot();
  return refreshed.prices[asset]?.priceInr ?? 0;
}

export async function ensureWallet(userId: string): Promise<Wallet> {
  const userRef = doc(usersCol, userId);
  const userSnap = await getDoc(userRef);
  const now = Date.now();
  const defaults: Wallet = {
    userId,
    balance: 0,
    locked: 0,
    updatedAt: now,
  };

  if (!userSnap.exists()) {
    throw new Error("User profile not found");
  }

  const data = userSnap.data() as Partial<Wallet>;
  const wallet: Wallet = {
    userId,
    balance: typeof data.balance === "number" ? data.balance : defaults.balance,
    locked: typeof data.locked === "number" ? data.locked : defaults.locked,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : defaults.updatedAt,
  };

  if (
    wallet.balance !== data.balance ||
    wallet.locked !== data.locked ||
    wallet.updatedAt !== data.updatedAt
  ) {
    await setDoc(userRef, wallet, { merge: true });
  }

  return wallet;
}

export function subscribeWallet(
  userId: string,
  onData: (wallet: Wallet) => void,
  onError?: (error: unknown) => void,
) {
  return onSnapshot(
    doc(usersCol, userId),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Partial<Wallet>;
      onData({
        userId,
        balance: typeof data.balance === "number" ? data.balance : 0,
        locked: typeof data.locked === "number" ? data.locked : 0,
        updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
      });
    },
    (error) => onError?.(error),
  );
}

export function subscribeTrades(
  userId: string,
  onData: (trades: Trade[]) => void,
  onError?: (error: unknown) => void,
) {
  const q = query(tradesCol, where("userId", "==", userId));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Trade, "id">) })) as Trade[];
      rows.sort((a, b) => b.timestamp - a.timestamp);
      onData(rows);
    },
    (error) => onError?.(error),
  );
}

export function subscribeAllTrades(
  onData: (trades: Trade[]) => void,
  onError?: (error: unknown) => void,
) {
  const q = query(tradesCol, orderBy("timestamp", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Trade, "id">) })) as Trade[],
      );
    },
    (error) => onError?.(error),
  );
}

async function getAvailableHoldingQty(userId: string, asset: string) {
  const q = query(tradesCol, where("userId", "==", userId));
  const snap = await getDocs(q);

  const rows = snap.docs
    .map((d) => d.data() as Omit<Trade, "id">)
    .filter((trade) => trade.asset === asset && trade.status === "open");
  const buyQty = rows.filter((trade) => trade.type === "buy").reduce((acc, trade) => acc + trade.quantity, 0);
  const sellQty = rows.filter((trade) => trade.type === "sell").reduce((acc, trade) => acc + trade.quantity, 0);

  return Math.max(0, buyQty - sellQty);
}

export async function placeTrade(input: {
  userId: string;
  asset: string;
  type: "buy" | "sell";
  quantity: number;
}) {
  const { userId, asset, type, quantity } = input;
  const snapshot = getCurrentMarketSnapshot();
  const category = snapshot.prices[asset]?.category ?? inferMarketCategory(asset);
  const marketStatus = getMarketStatus(category);
  if (!marketStatus.isOpen) {
    throw new Error(marketStatus.message);
  }

  const currentPrice = await latestPrice(asset);
  if (!currentPrice || currentPrice <= 0) {
    throw new Error("Live price unavailable for selected asset");
  }

  const required = quantity * currentPrice;
  await ensureWallet(userId);
  const userRef = doc(usersCol, userId);
  const userProfileSnap = await getDoc(userRef);
  if (!userProfileSnap.exists()) {
    throw new Error("User profile not found");
  }

  const userProfile = userProfileSnap.data() as { displayName?: string; email?: string };
  const userDisplayName = userProfile.displayName ?? "Trader";
  const userEmail = userProfile.email ?? "";
  const userSearchKey = `${userDisplayName} ${userEmail} ${userId}`.trim().toLowerCase();

  if (type === "sell") {
    const availableQty = await getAvailableHoldingQty(userId, asset);
    if (availableQty < quantity) {
      throw new Error(`Insufficient holdings to sell. Available: ${availableQty.toFixed(4)}`);
    }
  }

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile not found");
    }

    const userData = userSnap.data() as Partial<Wallet>;
    const wallet: Wallet = {
      userId,
      balance: typeof userData.balance === "number" ? userData.balance : 0,
      locked: typeof userData.locked === "number" ? userData.locked : 0,
      updatedAt: Date.now(),
    };

    if (wallet.balance < required) {
      throw new Error("Insufficient wallet balance");
    }

    tx.set(
      userRef,
      {
        balance: wallet.balance - required,
        locked: wallet.locked + required,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  });

  await addDoc(tradesCol, {
    userId,
    userDisplayName,
    userEmail,
    userSearchKey,
    asset,
    type,
    quantity,
    entryPrice: currentPrice,
    currentPrice,
    pnl: 0,
    status: "open",
    timestamp: Date.now(),
    createdAtServer: serverTimestamp(),
  });

  try {
    await addDoc(transactionsCol, {
      userId,
      type: "trade_pnl",
      amount: -required,
      status: "completed",
      createdAt: Date.now(),
      createdAtServer: serverTimestamp(),
      note: `Margin blocked for ${type.toUpperCase()} ${asset}`,
    });
  } catch (error) {
    console.error("[Trading] Transaction log write failed after trade placement", error);
  }
}

export async function closeTrade(trade: Trade) {
  const currentPrice = await latestPrice(trade.asset);
  if (!currentPrice || currentPrice <= 0) {
    throw new Error("Live price unavailable for selected asset");
  }

  const pnlPerUnit =
    trade.type === "buy"
      ? currentPrice - trade.entryPrice
      : trade.entryPrice - currentPrice;

  const pnl = pnlPerUnit * trade.quantity;
  const principal = trade.entryPrice * trade.quantity;
  const now = Date.now();

  await updateDoc(doc(tradesCol, trade.id), {
    currentPrice,
    pnl,
    status: "closed",
    closedAt: now,
  });

  await updateDoc(doc(usersCol, trade.userId), {
    balance: increment(principal + pnl),
    locked: increment(-principal),
    updatedAt: now,
  });

  try {
    await addDoc(transactionsCol, {
      userId: trade.userId,
      type: "trade_pnl",
      amount: principal + pnl,
      status: "completed",
      createdAt: now,
      createdAtServer: serverTimestamp(),
      note: `Trade closed ${trade.asset} (${trade.type.toUpperCase()}) P/L ${pnl.toFixed(2)}`,
    });
  } catch (error) {
    console.error("[Trading] Transaction log write failed after trade close", error);
  }
}
