export type UserRole = "user" | "admin";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: number;
}

export interface MarketPrice {
  symbol: string;
  category: "forex" | "crypto" | "metal";
  priceUsd: number;
  priceInr: number;
  change24h: number;
  updatedAt: number;
}

export interface MarketSnapshot {
  prices: Record<string, MarketPrice>;
  usdInr: number;
  updatedAt: number;
  source: "polling" | "manual";
}

export interface CandlePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Trade {
  id: string;
  asset: string;
  type: "buy" | "sell";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  status: "open" | "closed";
  timestamp: number;
  closedAt?: number;
  userId: string;
  userDisplayName?: string;
  userEmail?: string;
  userSearchKey?: string;
}

export interface Wallet {
  userId: string;
  balance: number;
  locked: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "deposit" | "withdrawal" | "trade_pnl" | "admin_adjustment";
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: number;
  note?: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  amount: number;
  upiId: string;
  screenshotUrl: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  upiId: string;
  accountNumber: string;
  ifscCode: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface DashboardAnalytics {
  totalUsers: number;
  openTrades: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  marketUpdatedAt: number;
}
