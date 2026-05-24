"use client";

import { useMemo, useState } from "react";
import { AdminRoute } from "@/components/guards/AdminRoute";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateUserStatus, useUsers } from "@/hooks/useAdmin";
import { UserStatus } from "@/types";

export default function AdminKycPage() {
  const { appUser } = useAuth();
  const users = useUsers();
  const updateStatus = useUpdateUserStatus();
  const [activeUid, setActiveUid] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("pending");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    if (statusFilter === "all") return users;
    return users.filter((user) => (user.status ?? "pending") === statusFilter);
  }, [users, statusFilter]);

  const activeUser = useMemo(() => {
    return filteredUsers.find((user) => user.uid === activeUid) ?? filteredUsers[0];
  }, [filteredUsers, activeUid]);

  const aadhaarFrontSrc = activeUser?.aadhaarFrontBase64 || activeUser?.aadhaarFrontUrl || "";
  const aadhaarBackSrc = activeUser?.aadhaarBackBase64 || activeUser?.aadhaarBackUrl || "";
  const selfieSrc = activeUser?.selfieBase64 || activeUser?.selfieUrl || "";

  return (
    <AdminRoute>
      <AppShell title="KYC Verification">
        <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="glass space-y-2 p-4">
            <h3 className="text-sm font-medium">User KYC Documents ({filteredUsers.length})</h3>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as UserStatus | "all")}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm"
            >
              <option value="all">ALL</option>
              <option value="pending">PENDING</option>
              <option value="approved">APPROVED</option>
              <option value="rejected">REJECTED</option>
              <option value="suspended">SUSPENDED</option>
              <option value="banned">BANNED</option>
            </select>
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.uid}
                  type="button"
                  onClick={() => setActiveUid(user.uid)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    activeUser?.uid === user.uid
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-zinc-700 bg-zinc-900/50"
                  }`}
                >
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-xs text-zinc-400">{user.email}</p>
                  <p className="text-xs text-zinc-500">{(user.status ?? "pending").toUpperCase()}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="glass space-y-3 p-4">
            {activeUser ? (
              <>
                <div>
                  <h3 className="text-sm font-medium">{activeUser.displayName}</h3>
                  <p className="text-xs text-zinc-400">{activeUser.email} • {activeUser.phone}</p>
                  <p className="text-xs text-zinc-400">Aadhaar: {activeUser.aadhaarNumber || "-"} • PAN: {activeUser.panNumber || "-"}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <a href={aadhaarFrontSrc || "#"} target="_blank" className="rounded-lg border border-zinc-700 p-2" rel="noreferrer">
                    <p className="mb-2 text-xs text-zinc-400">Aadhaar Front</p>
                    {aadhaarFrontSrc ? <img src={aadhaarFrontSrc} alt="Aadhaar front" className="h-48 w-full rounded object-cover" /> : <p className="text-xs">Not uploaded</p>}
                  </a>
                  <a href={aadhaarBackSrc || "#"} target="_blank" className="rounded-lg border border-zinc-700 p-2" rel="noreferrer">
                    <p className="mb-2 text-xs text-zinc-400">Aadhaar Back</p>
                    {aadhaarBackSrc ? <img src={aadhaarBackSrc} alt="Aadhaar back" className="h-48 w-full rounded object-cover" /> : <p className="text-xs">Not uploaded</p>}
                  </a>
                </div>

                {selfieSrc ? (
                  <a href={selfieSrc} target="_blank" className="block rounded-lg border border-zinc-700 p-2" rel="noreferrer">
                    <p className="mb-2 text-xs text-zinc-400">Selfie</p>
                    <img src={selfieSrc} alt="Selfie" className="h-56 w-full rounded object-cover" />
                  </a>
                ) : null}

                <div className="flex gap-2">
                  <button
                    disabled={updateStatus.isPending}
                    className="rounded-md bg-emerald-500 px-5 py-3 text-base font-bold text-zinc-900"
                    onClick={async () => {
                      const key = `${activeUser.uid}-approved`;
                      setActiveAction(key);
                      await updateStatus.mutateAsync({
                        userId: activeUser.uid,
                        adminId: appUser?.uid ?? "admin",
                        status: "approved",
                      }).finally(() => setActiveAction(null));
                    }}
                  >
                    {activeAction === `${activeUser.uid}-approved` ? "Approving..." : "Approve User"}
                  </button>
                  <button
                    disabled={updateStatus.isPending}
                    className="rounded-md bg-red-500 px-5 py-3 text-base font-bold"
                    onClick={async () => {
                      const key = `${activeUser.uid}-rejected`;
                      setActiveAction(key);
                      await updateStatus.mutateAsync({
                        userId: activeUser.uid,
                        adminId: appUser?.uid ?? "admin",
                        status: "rejected",
                        reason: "KYC document verification failed",
                      }).finally(() => setActiveAction(null));
                    }}
                  >
                    {activeAction === `${activeUser.uid}-rejected` ? "Rejecting..." : "Reject User"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-400">No users found for selected filter.</p>
            )}
          </div>
        </section>
      </AppShell>
    </AdminRoute>
  );
}
