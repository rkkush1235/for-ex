"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AdminRoute } from "@/components/guards/AdminRoute";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateUserStatus, useUsers } from "@/hooks/useAdmin";
import { useAdjustWallet } from "@/hooks/useWalletRequests";
import { UserStatus } from "@/types";
import { formatCurrency } from "@/utils/format";

const filterOptions: Array<UserStatus | "all"> = ["all", "pending", "approved", "rejected", "suspended", "banned"];

export default function AdminUsersPage() {
  const { appUser } = useAuth();
  const users = useUsers();
  const updateStatus = useUpdateUserStatus();
  const adjustWallet = useAdjustWallet();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [walletAmount, setWalletAmount] = useState<Record<string, number>>({});
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const rows = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter !== "all" && (user.status ?? "pending") !== statusFilter) return false;
      const key = `${user.displayName} ${user.email} ${user.phone ?? ""} ${user.accountId ?? ""}`.toLowerCase();
      return key.includes(search.toLowerCase());
    });
  }, [users, search, statusFilter]);

  return (
    <AdminRoute>
      <AppShell title="Admin Users">
        <section className="glass space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name/email/phone/account id"
              className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as UserStatus | "all")}
              className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
            >
              {filterOptions.map((option) => (
                <option key={option} value={option}>{option.toUpperCase()}</option>
              ))}
            </select>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-300">
              Showing {rows.length} users
            </div>
          </div>
        </section>

        <section className="space-y-2">
          {rows.map((user) => (
            <div key={user.uid} className="glass space-y-3 rounded-lg p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{user.displayName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()}</p>
                  <p className="text-xs text-zinc-400">{user.email} • {user.phone || "N/A"}</p>
                  <p className="text-xs text-zinc-400">Status: {(user.status ?? "pending").toUpperCase()} • Account: {user.accountId || "-"}</p>
                </div>
                <p className="text-xs text-zinc-400">Balance: {formatCurrency(user.balance ?? 0)}</p>
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                <button
                  disabled={updateStatus.isPending}
                  className="rounded-md bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-900"
                  onClick={async () => {
                    const key = `${user.uid}-approved`;
                    setActiveAction(key);
                    await updateStatus.mutateAsync({ userId: user.uid, adminId: appUser?.uid ?? "admin", status: "approved" }).finally(() => setActiveAction(null));
                  }}
                >
                  {activeAction === `${user.uid}-approved` ? "Approving..." : "Approve"}
                </button>
                <button
                  disabled={updateStatus.isPending}
                  className="rounded-md bg-red-500 px-4 py-3 text-sm font-bold"
                  onClick={async () => {
                    const key = `${user.uid}-rejected`;
                    setActiveAction(key);
                    await updateStatus.mutateAsync({ userId: user.uid, adminId: appUser?.uid ?? "admin", status: "rejected", reason: "KYC verification failed" }).finally(() => setActiveAction(null));
                  }}
                >
                  {activeAction === `${user.uid}-rejected` ? "Rejecting..." : "Reject"}
                </button>
                <button
                  disabled={updateStatus.isPending}
                  className="rounded-md bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-900"
                  onClick={async () => {
                    const key = `${user.uid}-suspended`;
                    setActiveAction(key);
                    await updateStatus.mutateAsync({ userId: user.uid, adminId: appUser?.uid ?? "admin", status: "suspended" }).finally(() => setActiveAction(null));
                  }}
                >
                  {activeAction === `${user.uid}-suspended` ? "Suspending..." : "Suspend"}
                </button>
                <button
                  disabled={updateStatus.isPending}
                  className="rounded-md bg-zinc-800 px-4 py-3 text-sm font-bold"
                  onClick={async () => {
                    const key = `${user.uid}-banned`;
                    setActiveAction(key);
                    await updateStatus.mutateAsync({ userId: user.uid, adminId: appUser?.uid ?? "admin", status: "banned" }).finally(() => setActiveAction(null));
                  }}
                >
                  {activeAction === `${user.uid}-banned` ? "Banning..." : "Ban"}
                </button>
              </div>

              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  type="number"
                  value={walletAmount[user.uid] ?? user.balance ?? 0}
                  onChange={(event) =>
                    setWalletAmount((prev) => ({ ...prev, [user.uid]: Number(event.target.value) }))
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
                />
                <button
                  disabled={adjustWallet.isPending}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold"
                  onClick={async () => {
                    const key = `${user.uid}-wallet`;
                    setActiveAction(key);
                    await adjustWallet.mutateAsync({
                      userId: user.uid,
                      balance: walletAmount[user.uid] ?? user.balance ?? 0,
                    }).finally(() => setActiveAction(null));
                  }}
                >
                  {activeAction === `${user.uid}-wallet` ? "Updating..." : "Update Wallet Balance"}
                </button>
              </div>
            </div>
          ))}
        </section>
      </AppShell>
    </AdminRoute>
  );
}
