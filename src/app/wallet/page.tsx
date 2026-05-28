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
  const balance = wallet?.balance ?? 0;
  const maxAccessMultiplier = 300;

  return (
    <AppShell title="Wallet">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Available Balance" value={formatCurrency(balance)} />
        {balance > 0 ? (
          <div className="glass p-4">
            <p className="text-xs text-zinc-400">Company Fund</p>
            <p className="mt-1 text-base font-semibold text-cyan-300">Up to {maxAccessMultiplier}x Access</p>
            <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
              You can use up to 300x without any extra payment. These funds are provided by the company.
            </div>
          </div>
        ) : null}
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
