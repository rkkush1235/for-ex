"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function ApprovalStatusPage() {
  const { appUser, loading, logout } = useAuth();

  if (loading) {
    return <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center">Loading...</div>;
  }

  if (!appUser) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
        <div className="glass w-full space-y-3 p-6 text-center">
          <p className="text-zinc-200">Please login to view account approval status.</p>
          <Link href="/login" className="inline-block rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-900">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const status = appUser.status ?? "pending";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
      <div className="glass w-full space-y-4 p-6">
        <h1 className="text-xl font-semibold">Account Verification</h1>
        {status === "approved" ? (
          <p className="text-emerald-400">Your account is approved. You can continue to dashboard.</p>
        ) : null}
        {status === "pending" ? (
          <p className="text-amber-300">Waiting for admin approval. We will notify you once your KYC is verified.</p>
        ) : null}
        {status === "rejected" ? (
          <p className="text-red-400">KYC rejected. Please contact support and resubmit details.</p>
        ) : null}
        {(status === "suspended" || status === "banned") ? (
          <p className="text-red-400">Your account is restricted. Please contact support.</p>
        ) : null}

        <div className="flex gap-2">
          {status === "approved" ? (
            <Link href="/dashboard" className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-zinc-900">
              Go to Dashboard
            </Link>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              await logout();
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
