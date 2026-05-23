"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AdminRoute } from "@/components/guards/AdminRoute";
import { useAuth } from "@/hooks/useAuth";
import {
  useAdjustWallet,
  useDeposits,
  useReviewDeposit,
  useReviewWithdrawal,
  useWithdrawals,
} from "@/hooks/useWalletRequests";
import { useAllTrades } from "@/hooks/useTrading";
import { closeTrade } from "@/services/tradingService";
import { useAnalytics, useUsers } from "@/hooks/useAdmin";
import { useMarketData } from "@/hooks/useMarketData";

export default function AdminPage() {
  const { appUser } = useAuth();
  const users = useUsers();
  const analytics = useAnalytics();
  const deposits = useDeposits();
  const withdrawals = useWithdrawals();
  const trades = useAllTrades();
  const reviewDeposit = useReviewDeposit();
  const reviewWithdrawal = useReviewWithdrawal();
  const adjustWallet = useAdjustWallet();
  const snapshot = useMarketData();

  const [manualSymbol, setManualSymbol] = useState("BTC");
  const [manualInrPrice, setManualInrPrice] = useState(0);
  const [walletUserId, setWalletUserId] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);

  const pendingDeposits = deposits.filter((item) => item.status === "pending").length;
  const pendingWithdrawals = withdrawals.filter((item) => item.status === "pending").length;
  const openTrades = trades.filter((item) => item.status === "open").length;

  return (
    <AdminRoute>
      <AppShell title="Admin Panel">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="glass p-4 text-sm">Users: {users.length || analytics.totalUsers}</div>
          <div className="glass p-4 text-sm">Open Trades: {openTrades || analytics.openTrades}</div>
          <div className="glass p-4 text-sm">Pending Deposits: {pendingDeposits || analytics.pendingDeposits}</div>
          <div className="glass p-4 text-sm">Pending Withdrawals: {pendingWithdrawals || analytics.pendingWithdrawals}</div>
        </section>

        <section className="glass space-y-3 p-4">
          <h3 className="text-sm font-medium">Manual Market Price Edit</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
              value={manualSymbol}
              onChange={(event) => setManualSymbol(event.target.value)}
            >
              {Object.keys(snapshot.prices).map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={manualInrPrice}
              onChange={(event) => setManualInrPrice(Number(event.target.value))}
              className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
            />
            <button
              className="rounded-lg bg-amber-400 px-3 py-2 font-medium text-zinc-900"
              onClick={() => {
                return;
              }}
            >
              Update Price (Disabled)
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Firebase is restricted to user records only; live market prices are API-driven.
          </p>
        </section>

        <section className="glass space-y-3 p-4">
          <h3 className="text-sm font-medium">Edit Wallet Balances</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              placeholder="User ID"
              value={walletUserId}
              onChange={(event) => setWalletUserId(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
            />
            <input
              type="number"
              placeholder="New Balance"
              value={walletBalance}
              onChange={(event) => setWalletBalance(Number(event.target.value))}
              className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
            />
            <button
              className="rounded-lg bg-emerald-500 px-3 py-2 font-medium text-zinc-900"
              onClick={() =>
                adjustWallet.mutate({ userId: walletUserId.trim(), balance: walletBalance })
              }
            >
              Update Wallet
            </button>
          </div>
        </section>

        <section className="glass p-4">
          <h3 className="mb-3 text-sm font-medium">Approve Deposits</h3>
          <div className="space-y-2">
            {deposits.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/80 p-3 text-sm">
                <span>{item.userId.slice(0, 8)} • ₹{item.amount} • {item.status}</span>
                <div className="flex gap-2">
                  <button
                    className="rounded-md bg-emerald-500 px-2 py-1 text-xs text-zinc-900"
                    onClick={() =>
                      reviewDeposit.mutate({
                        requestId: item.id,
                        userId: item.userId,
                        amount: item.amount,
                        adminId: appUser?.uid ?? "admin",
                        status: "approved",
                      })
                    }
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-md bg-red-500 px-2 py-1 text-xs"
                    onClick={() =>
                      reviewDeposit.mutate({
                        requestId: item.id,
                        userId: item.userId,
                        amount: item.amount,
                        adminId: appUser?.uid ?? "admin",
                        status: "rejected",
                      })
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass p-4">
          <h3 className="mb-3 text-sm font-medium">Approve Withdrawals</h3>
          <div className="space-y-2">
            {withdrawals.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/80 p-3 text-sm">
                <span>{item.userId.slice(0, 8)} • ₹{item.amount} • {item.status}</span>
                <div className="flex gap-2">
                  <button
                    className="rounded-md bg-emerald-500 px-2 py-1 text-xs text-zinc-900"
                    onClick={() =>
                      reviewWithdrawal.mutate({
                        requestId: item.id,
                        userId: item.userId,
                        amount: item.amount,
                        adminId: appUser?.uid ?? "admin",
                        status: "approved",
                      })
                    }
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-md bg-red-500 px-2 py-1 text-xs"
                    onClick={() =>
                      reviewWithdrawal.mutate({
                        requestId: item.id,
                        userId: item.userId,
                        amount: item.amount,
                        adminId: appUser?.uid ?? "admin",
                        status: "rejected",
                      })
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass p-4">
          <h3 className="mb-3 text-sm font-medium">Manage Trades</h3>
          <div className="space-y-2">
            {trades.slice(0, 40).map((trade) => (
              <div key={trade.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/80 p-3 text-sm">
                <span>{trade.asset} • {trade.type} • {trade.status} • {trade.userId.slice(0, 8)}</span>
                {trade.status === "open" ? (
                  <button className="rounded-md bg-zinc-800 px-2 py-1 text-xs" onClick={() => closeTrade(trade)}>
                    Force Close
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </AppShell>
    </AdminRoute>
  );
}
