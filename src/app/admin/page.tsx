"use client";

import { useState } from "react";
import Link from "next/link";
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
import { useAdminUpdateTradeEntryPrice, useAllTrades } from "@/hooks/useTrading";
import { closeTrade } from "@/services/tradingService";
import { useActivityLogs, useAnalytics, useUsers } from "@/hooks/useAdmin";
import { useMarketData } from "@/hooks/useMarketData";
import { formatCurrency } from "@/utils/format";

export default function AdminPage() {
  const { appUser } = useAuth();
  const users = useUsers();
  const logs = useActivityLogs();
  const analytics = useAnalytics();
  const deposits = useDeposits();
  const withdrawals = useWithdrawals();
  const trades = useAllTrades();
  const reviewDeposit = useReviewDeposit();
  const reviewWithdrawal = useReviewWithdrawal();
  const adjustWallet = useAdjustWallet();
  const updateTradeEntryPrice = useAdminUpdateTradeEntryPrice();
  const snapshot = useMarketData();

  const [manualSymbol, setManualSymbol] = useState("BTC");
  const [manualUsdPrice, setManualUsdPrice] = useState(0);
  const [walletUserId, setWalletUserId] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [entryPriceDrafts, setEntryPriceDrafts] = useState<Record<string, string>>({});
  const [updatingTradeId, setUpdatingTradeId] = useState<string | null>(null);

  const pendingDeposits = deposits.filter((item) => item.status === "pending").length;
  const pendingWithdrawals = withdrawals.filter((item) => item.status === "pending").length;
  const openTrades = trades.filter((item) => item.status === "open").length;
  const kycUsers = users.filter(
    (user) =>
      !!(user.aadhaarFrontBase64 || user.aadhaarBackBase64 || user.aadhaarFrontUrl || user.aadhaarBackUrl),
  );

  return (
    <AdminRoute>
      <AppShell title="Admin Panel">
        <section className="grid gap-3 md:grid-cols-3">
          <Link href="/admin/users" className="glass p-4 text-sm hover:bg-zinc-900/40">Manage Users & Wallets</Link>
          <Link href="/admin/kyc" className="glass p-4 text-sm hover:bg-zinc-900/40">KYC Verification Queue</Link>
          <Link href="/admin/settings" className="glass p-4 text-sm hover:bg-zinc-900/40">Admin Settings</Link>
          <Link href="/admin/deposits" className="glass p-4 text-sm hover:bg-zinc-900/40">Deposit Approvals</Link>
          <Link href="/admin/withdrawals" className="glass p-4 text-sm hover:bg-zinc-900/40">Withdrawal Approvals</Link>
        </section>

        <section className="glass p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Uploaded KYC Documents</h3>
            <Link href="/admin/kyc" className="text-xs text-emerald-400">Open Full KYC Review</Link>
          </div>
          {kycUsers.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {kycUsers.slice(0, 6).map((user) => {
                const frontSrc = user.aadhaarFrontBase64 || user.aadhaarFrontUrl || "";
                const backSrc = user.aadhaarBackBase64 || user.aadhaarBackUrl || "";
                return (
                  <div key={user.uid} className="rounded-lg border border-zinc-700/80 p-3 text-xs">
                    <p className="mb-2 font-medium">{user.displayName || user.email}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded border border-zinc-700 p-1">
                        <p className="mb-1 text-[10px] text-zinc-400">Front</p>
                        {frontSrc ? (
                          <img src={frontSrc} alt="Aadhaar front" className="h-20 w-full rounded object-cover" />
                        ) : (
                          <p className="text-[10px] text-zinc-500">Missing</p>
                        )}
                      </div>
                      <div className="rounded border border-zinc-700 p-1">
                        <p className="mb-1 text-[10px] text-zinc-400">Back</p>
                        {backSrc ? (
                          <img src={backSrc} alt="Aadhaar back" className="h-20 w-full rounded object-cover" />
                        ) : (
                          <p className="text-[10px] text-zinc-500">Missing</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No uploaded KYC documents found yet.</p>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <div className="glass p-4 text-sm">Users: {users.length || analytics.totalUsers}</div>
          <div className="glass p-4 text-sm">Open Trades: {openTrades || analytics.openTrades}</div>
          <div className="glass p-4 text-sm">Pending Deposits: {pendingDeposits || analytics.pendingDeposits}</div>
          <div className="glass p-4 text-sm">Pending Withdrawals: {pendingWithdrawals || analytics.pendingWithdrawals}</div>
        </section>

        <section className="glass p-4">
          <h3 className="mb-3 text-sm font-medium">Admin Activity Logs</h3>
          <div className="space-y-2 text-xs text-zinc-300">
            {logs.slice(0, 15).map((log) => (
              <div key={log.id} className="rounded-lg border border-zinc-700/80 p-2">
                <p>{log.action} • {log.userId.slice(0, 8)}</p>
                <p className="text-zinc-400">{log.message}</p>
              </div>
            ))}
            {!logs.length ? <p className="text-zinc-500">No activity logs yet.</p> : null}
          </div>
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
              value={manualUsdPrice}
              onChange={(event) => setManualUsdPrice(Number(event.target.value))}
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
                <span>{item.userId.slice(0, 8)} • {formatCurrency(item.amount)} • {item.status}</span>
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
                <span>{item.userId.slice(0, 8)} • {formatCurrency(item.amount)} • {item.status}</span>
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
            {trades.slice(0, 40).map((trade) => {
              const currentPrice = snapshot.prices[trade.asset]?.priceUsd ?? trade.currentPrice;
              const pnlPerUnit =
                trade.type === "buy"
                  ? currentPrice - trade.entryPrice
                  : trade.entryPrice - currentPrice;
              const profitLoss = trade.status === "open" ? pnlPerUnit * trade.quantity : trade.pnl;
              const draftValue = entryPriceDrafts[trade.id] ?? String(trade.entryPrice);
              const parsedDraftValue = Number(draftValue);
              const canUpdateEntryPrice =
                Number.isFinite(parsedDraftValue) &&
                parsedDraftValue > 0 &&
                parsedDraftValue !== trade.entryPrice;
              const isUpdatingThisTrade = updatingTradeId === trade.id;

              return (
                <div key={trade.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/80 p-3 text-sm">
                  <span>
                    {trade.asset} • {trade.type} • {trade.status} • {trade.userDisplayName ?? trade.userEmail ?? trade.userId.slice(0, 8)}
                  </span>
                  <span className={profitLoss >= 0 ? "text-emerald-400" : "text-red-400"}>
                    P/L: {formatCurrency(profitLoss)}
                  </span>
                  <div className="w-full rounded-md border border-zinc-700/80 bg-zinc-900/40 p-2 sm:w-auto">
                    <p className="mb-2 text-[11px] text-zinc-400">
                      Current Entry Price: {formatCurrency(trade.entryPrice)}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="number"
                      step="0.01"
                      value={draftValue}
                      placeholder="Enter new entry price"
                      inputMode="decimal"
                      aria-label="Update entry price"
                      onChange={(event) =>
                        setEntryPriceDrafts((prev) => ({
                          ...prev,
                          [trade.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm sm:w-44"
                    />
                    <button
                      className="w-full rounded-md bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      disabled={!canUpdateEntryPrice || !!updatingTradeId}
                      onClick={() => {
                        setUpdatingTradeId(trade.id);
                        return (
                        updateTradeEntryPrice.mutate(
                          { tradeId: trade.id, entryPrice: parsedDraftValue },
                          {
                            onSuccess: () => {
                              setEntryPriceDrafts((prev) => {
                                const next = { ...prev };
                                delete next[trade.id];
                                return next;
                              });
                            },
                            onSettled: () => {
                              setUpdatingTradeId(null);
                            },
                          },
                        )
                        );
                      }}
                    >
                      {isUpdatingThisTrade ? "Updating..." : "Update Entry Price"}
                    </button>
                    </div>
                  </div>
                  {trade.status === "open" ? (
                    <button className="rounded-md bg-zinc-800 px-2 py-1 text-xs" onClick={() => closeTrade(trade)}>
                      Force Close
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </AppShell>
    </AdminRoute>
  );
}
