import { MarketPrice } from "@/types";

type AssetCategory = MarketPrice["category"];

function getIstParts(date = new Date()) {
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60_000;
  const ist = new Date(utcTime + 5.5 * 60 * 60 * 1000);

  return {
    day: ist.getUTCDay(),
    hour: ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
  };
}

export function inferMarketCategory(asset: string): AssetCategory {
  const normalized = asset.trim().toUpperCase();

  if (["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE"].includes(normalized)) {
    return "crypto";
  }

  if (["GOLD", "SILVER", "XAUUSD", "XAGUSD"].includes(normalized)) {
    return "metal";
  }

  return "forex";
}

export function getMarketStatus(category: AssetCategory, date = new Date()) {
  if (category === "crypto") {
    return { isOpen: true, message: "Crypto market is open 24/7" };
  }

  const { day, hour, minute } = getIstParts(date);
  const minuteOfDay = hour * 60 + minute;
  const minuteOfWeek = day * 1440 + minuteOfDay;

  if (category === "forex") {
    const openFrom = 1 * 1440 + 5 * 60;
    const openTill = 6 * 1440 + 3 * 60 + 30;
    const isOpen = minuteOfWeek >= openFrom && minuteOfWeek < openTill;

    return {
      isOpen,
      message: isOpen
        ? "Forex market is open"
        : "Market Closed: Forex session is currently closed",
    };
  }

  const isWeekday = day >= 1 && day <= 5;
  const isSessionTime = minuteOfDay >= 6 * 60 && minuteOfDay < 23 * 60 + 30;
  const isOpen = isWeekday && isSessionTime;

  return {
    isOpen,
    message: isOpen
      ? "Metals market is open"
      : "Market Closed: Gold/Silver session is currently closed",
  };
}
