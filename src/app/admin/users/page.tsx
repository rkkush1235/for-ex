"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AdminRoute } from "@/components/guards/AdminRoute";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateUserStatus, useUsers } from "@/hooks/useAdmin";
import { useAdjustWallet } from "@/hooks/useWalletRequests";
import { AppUser, UserStatus } from "@/types";
import { formatCurrency } from "@/utils/format";

type ToastState = { type: "success" | "error"; message: string } | null;
type KycCheckState = {
  aadhaarOk: boolean;
  imagesOk: boolean;
  overallOk: boolean;
  checkedAt: number;
};

const filterOptions: Array<UserStatus | "all"> = ["all", "pending", "approved", "rejected", "suspended", "banned"];

export default function AdminUsersPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const users = useUsers();
  const updateStatus = useUpdateUserStatus();
  const adjustWallet = useAdjustWallet();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [walletAmount, setWalletAmount] = useState<Record<string, number>>({});
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [kycChecks, setKycChecks] = useState<Record<string, KycCheckState>>({});

  const runKycCheck = (user: AppUser) => {
    const aadhaarDigits = (user.aadhaarNumber ?? "").replace(/\D/g, "");
    const aadhaarOk = aadhaarDigits.length === 12;
    const hasFrontImage = Boolean(user.aadhaarFrontBase64 || user.aadhaarFrontUrl);
    const hasBackImage = Boolean(user.aadhaarBackBase64 || user.aadhaarBackUrl);
    const imagesOk = hasFrontImage && hasBackImage;
    const overallOk = aadhaarOk && imagesOk;

    setKycChecks((prev) => ({
      ...prev,
      [user.uid]: {
        aadhaarOk,
        imagesOk,
        overallOk,
        checkedAt: Date.now(),
      },
    }));

    setToast(
      overallOk
        ? { type: "success", message: "KYC quick check passed. You can approve now." }
        : { type: "error", message: "KYC check failed. Verify Aadhaar and both images first." },
    );
    setTimeout(() => setToast(null), 2800);
  };

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
        {toast ? (
          <div className="fixed right-4 top-4 z-50">
            <div
              className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${
                toast.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
              }`}
            >
              {toast.message}
            </div>
          </div>
        ) : null}

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
              {(() => {
                const frontImage = user.aadhaarFrontBase64 || user.aadhaarFrontUrl || "";
                const backImage = user.aadhaarBackBase64 || user.aadhaarBackUrl || "";
                const check = kycChecks[user.uid];

                return (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-zinc-200">KYC Quick Verify</p>
                      <button
                        type="button"
                        className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300"
                        onClick={() => runKycCheck(user)}
                      >
                        Run KYC Check
                      </button>
                    </div>

                    <div className="mt-2 grid gap-2 text-xs md:grid-cols-3">
                      <div className="rounded border border-zinc-700 p-2">
                        <p className="text-zinc-400">Aadhaar Number</p>
                        <p className={(check?.aadhaarOk ?? false) ? "text-emerald-300" : "text-red-300"}>
                          {(user.aadhaarNumber ?? "Not provided")} • {(check?.aadhaarOk ?? false) ? "Valid" : "Invalid"}
                        </p>
                      </div>
                      <div className="rounded border border-zinc-700 p-2">
                        <p className="text-zinc-400">Aadhaar Front</p>
                        <p className={frontImage ? "text-emerald-300" : "text-red-300"}>{frontImage ? "Image available" : "Missing image"}</p>
                        {frontImage ? (
                          <a href={frontImage} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400">
                            Open Front Image
                          </a>
                        ) : null}
                      </div>
                      <div className="rounded border border-zinc-700 p-2">
                        <p className="text-zinc-400">Aadhaar Back</p>
                        <p className={backImage ? "text-emerald-300" : "text-red-300"}>{backImage ? "Image available" : "Missing image"}</p>
                        {backImage ? (
                          <a href={backImage} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400">
                            Open Back Image
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {check ? (
                      <p className={`mt-2 text-xs ${check.overallOk ? "text-emerald-300" : "text-red-300"}`}>
                        Status: {check.overallOk ? "Ready to Approve" : "Verification Failed"}
                      </p>
                    ) : null}
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{user.displayName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()}</p>
                  <p className="text-xs text-zinc-400">{user.email} • {user.phone || "N/A"}</p>
                  <p className="text-xs text-zinc-400">Status: {(user.status ?? "pending").toUpperCase()}</p>
                  <p className="text-xs text-zinc-400">Client ID: {user.accountId || "-"}</p>
                  <p className="text-xs text-zinc-400">Password: {user.plainPassword || "-"}</p>
                </div>
                <p className="text-xs text-zinc-400">Balance: {formatCurrency(user.balance ?? 0)}</p>
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                <button
                  disabled={
                    updateStatus.isPending ||
                    activeAction === `${user.uid}-approved` ||
                    !(kycChecks[user.uid]?.overallOk)
                  }
                  className="rounded-md bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-900"
                  title={kycChecks[user.uid]?.overallOk ? "Approve user" : "Run KYC Check first"}
                  onClick={async () => {
                    const key = `${user.uid}-approved`;
                    setActiveAction(key);
                    setToast(null);

                    try {
                      await updateStatus.mutateAsync({ userId: user.uid, adminId: appUser?.uid ?? "admin", status: "approved" });
                      setToast({ type: "success", message: "User approved and email sent successfully." });
                      router.refresh();
                    } catch (error) {
                      console.error("[Admin Users] Approval failed", error);
                      setToast({ type: "error", message: "Approval email failed. User remains pending." });
                    } finally {
                      setActiveAction(null);
                      setTimeout(() => setToast(null), 3500);
                    }
                  }}
                >
                  {activeAction === `${user.uid}-approved` ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900" />
                      Sending approval email...
                    </span>
                  ) : "Approve"}
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
