"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useCloseTrade, useTrades } from "@/hooks/useTrading";
import { useMarketData } from "@/hooks/useMarketData";
import { TradesTable } from "@/components/trades/TradesTable";

export default function TradesPage() {
  const { appUser } = useAuth();
  const trades = useTrades(appUser?.uid);
  const market = useMarketData();
  const closeTrade = useCloseTrade();

  return (
    <AppShell title="Position">
      <TradesTable
        trades={trades}
        priceMap={market.prices}
        onClose={(trade) => closeTrade.mutate(trade)}
      />
    </AppShell>
  );
}
