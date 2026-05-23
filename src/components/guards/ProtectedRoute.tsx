"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, firebaseUser, router]);

  if (!mounted || loading) {
    return <div className="p-6 text-sm text-zinc-300">Checking session...</div>;
  }

  if (!firebaseUser) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-zinc-300">Session not found. Please login to continue.</p>
        <Link
          href="/login"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
