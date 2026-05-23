"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TradingChart } from "@/charts/TradingChart";
import { MetricCard } from "@/components/ui/MetricCard";
import { MarketCards } from "@/components/markets/MarketCards";
import { useMarketData } from "@/hooks/useMarketData";
import { useAuth } from "@/hooks/useAuth";
import { useTrades, useWallet } from "@/hooks/useTrading";
import { useTransactions } from "@/hooks/useWalletRequests";
import { TransactionsTable } from "@/components/wallet/TransactionsTable";
import { formatCurrency } from "@/utils/format";

export default function DashboardPage() {
  const market = useMarketData();
  const { appUser } = useAuth();
  const wallet = useWallet(appUser?.uid);
  const trades = useTrades(appUser?.uid);
  const txRows = useTransactions(appUser?.uid);

  const openTrades = trades.filter((trade) => trade.status === "open");
  const livePnl = openTrades.reduce((acc, trade) => {
    const currentPrice = market.prices[trade.asset]?.priceInr ?? trade.currentPrice;
    const pnlPerUnit =
      trade.type === "buy" ? currentPrice - trade.entryPrice : trade.entryPrice - currentPrice;
    return acc + pnlPerUnit * trade.quantity;
  }, 0);

  return (
    <AppShell title="Dashboard">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Wallet Balance" value={formatCurrency(wallet?.balance ?? 0)} />
        <MetricCard label="Locked Margin" value={formatCurrency(wallet?.locked ?? 0)} />
        <MetricCard label="Open Trades" value={String(openTrades.length)} />
        <MetricCard label="Live P/L" value={formatCurrency(livePnl)} />
      </section>

      <MarketCards snapshot={market} />
      <TradingChart />

      <section className="glass p-4">
        <h3 className="mb-3 text-sm font-medium">Recent Transactions</h3>
        <TransactionsTable rows={txRows.slice(0, 6)} />
      </section>
    </AppShell>
  );
}
