"use client";

import { Menu, LogOut, Wallet } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useTrading";
import { formatCurrency } from "@/utils/format";

export function Navbar({ title }: { title: string }) {
  const { setSidebarOpen } = useAppStore();
  const { appUser, logout } = useAuth();
  const wallet = useWallet(appUser?.uid);
  const router = useRouter();

  return (
    <header className="glass sticky top-4 z-30 flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg bg-zinc-900/70 p-2 md:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-xs text-zinc-400">Live INR market feed</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative rounded-lg border border-zinc-700 bg-zinc-900/70 p-2">
          <Wallet size={16} className="text-zinc-200" />
          <span className="absolute -bottom-2 -right-2 rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200">
            {formatCurrency(wallet?.balance ?? 0)}
          </span>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{appUser?.displayName ?? "Trader"}</p>
          <p className="text-xs text-zinc-400 capitalize">{appUser?.role ?? "user"}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="rounded-lg border border-zinc-700 p-2 text-zinc-200 hover:bg-zinc-800"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
