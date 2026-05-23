"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useWalletRequests";
import { useWallet } from "@/hooks/useTrading";
import { TransactionsTable } from "@/components/wallet/TransactionsTable";
import { formatCurrency } from "@/utils/format";

export default function WalletPage() {
  const { appUser } = useAuth();
  const wallet = useWallet(appUser?.uid);
  const txRows = useTransactions(appUser?.uid);

  return (
    <AppShell title="Wallet">
      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Available Balance" value={formatCurrency(wallet?.balance ?? 0)} />
        <MetricCard label="Locked Margin" value={formatCurrency(wallet?.locked ?? 0)} />
        <div className="glass flex items-center gap-3 p-4">
          <Link href="/deposit" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-900">
            Deposit
          </Link>
          <Link href="/withdraw" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
            Withdraw
          </Link>
        </div>
      </section>

      <section className="glass p-4">
        <h3 className="mb-3 text-sm font-medium">Transaction History</h3>
        <TransactionsTable rows={txRows} />
      </section>
    </AppShell>
  );
}
