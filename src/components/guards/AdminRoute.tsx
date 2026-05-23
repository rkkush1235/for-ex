"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && appUser?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [loading, appUser, router]);

  if (loading || appUser?.role !== "admin") {
    return <div className="p-6 text-sm text-zinc-300">Checking admin access...</div>;
  }

  return <>{children}</>;
}
