export const TRADED_ASSETS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CAD",
  "BTC",
  "ETH",
  "SOL",
  "BNB",
  "XRP",
  "DOGE",
  "GOLD",
  "SILVER",
] as const;

export const MARKET_SYMBOL_MAP = {
  "EUR/USD": "EURUSD",
  "GBP/USD": "GBPUSD",
  "USD/JPY": "USDJPY",
  "AUD/USD": "AUDUSD",
  "USD/CAD": "USDCAD",
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
  GOLD: "XAUUSD",
  SILVER: "XAGUSD",
} as const;

export const POLL_INTERVAL_MS = 2_000;

export const ADMIN_UPI_ID = "tradehub@okicici";

export const ADMIN_BANK_DETAILS = {
  accountName: "TradeHub Markets Pvt Ltd",
  accountNumber: "912345678901",
  ifsc: "HDFC0001234",
  bank: "HDFC Bank",
};
