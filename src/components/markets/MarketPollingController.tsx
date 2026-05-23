"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { startMarketPolling } from "@/services/marketService";

export function MarketPollingController() {
  const { appUser } = useAuth();

  useEffect(() => {
    if (!appUser?.uid) return;
    const stop = startMarketPolling(appUser.uid, appUser.role === "admin");
    return () => stop();
  }, [appUser?.uid, appUser?.role]);

  return null;
}
