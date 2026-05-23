"use client";

import { useEffect, useState } from "react";
import { emptySnapshot } from "@/services/marketService";
import { subscribeMarketFeed } from "@/services/marketFeed";
import { MarketSnapshot } from "@/types";

export function useMarketData() {
  const [snapshot, setSnapshot] = useState<MarketSnapshot>(emptySnapshot());

  useEffect(() => {
    const unsubscribe = subscribeMarketFeed((next) => {
      setSnapshot(next);
    });

    return () => unsubscribe();
  }, []);

  return snapshot;
}
