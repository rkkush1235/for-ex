"use client";

import { useState } from "react";
import { AdminRoute } from "@/components/guards/AdminRoute";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useReviewWithdrawal, useWithdrawals } from "@/hooks/useWalletRequests";
import { formatCurrency } from "@/utils/format";

export default function AdminWithdrawalsPage() {
  const { appUser } = useAuth();
  const withdrawals = useWithdrawals();
  const reviewWithdrawal = useReviewWithdrawal();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  return (
    <AdminRoute>
      <AppShell title="Admin Withdrawals">
        <section className="glass p-4">
          <h3 className="mb-3 text-sm font-medium">Withdrawal Requests</h3>
          <div className="space-y-2">
            {withdrawals.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/80 p-3 text-sm">
                <span>{item.userId.slice(0, 8)} • {formatCurrency(item.amount)} • {item.status}</span>
                <div className="flex gap-2">
                  <button
                    disabled={reviewWithdrawal.isPending}
                    className="rounded-md bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-900"
                    onClick={async () => {
                      const key = `${item.id}-approve`;
                      setActiveAction(key);
                      await reviewWithdrawal.mutateAsync({
                        requestId: item.id,
                        userId: item.userId,
                        amount: item.amount,
                        adminId: appUser?.uid ?? "admin",
                        status: "approved",
                      }).finally(() => setActiveAction(null));
                    }}
                  >
                    {activeAction === `${item.id}-approve` ? "Approving..." : "Approve"}
                  </button>
                  <button
                    disabled={reviewWithdrawal.isPending}
                    className="rounded-md bg-red-500 px-4 py-3 text-sm font-bold"
                    onClick={async () => {
                      const key = `${item.id}-reject`;
                      setActiveAction(key);
                      await reviewWithdrawal.mutateAsync({
                        requestId: item.id,
                        userId: item.userId,
                        amount: item.amount,
                        adminId: appUser?.uid ?? "admin",
                        status: "rejected",
                      }).finally(() => setActiveAction(null));
                    }}
                  >
                    {activeAction === `${item.id}-reject` ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </AppShell>
    </AdminRoute>
  );
}
