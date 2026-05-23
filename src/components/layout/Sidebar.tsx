"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/format";
import { useAppStore } from "@/store/useAppStore";
import {
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  Settings,
  Shield,
  User,
  Wallet,
  Landmark,
  HandCoins,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/trading", label: "Trading", icon: CircleDollarSign },
  { href: "/trades", label: "Trades", icon: CircleDollarSign },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/deposit", label: "Deposit", icon: Landmark },
  { href: "/withdraw", label: "Withdraw", icon: HandCoins },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      <aside className="glass fixed left-4 top-4 z-40 hidden h-[calc(100vh-2rem)] w-64 p-4 md:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "glass fixed left-0 top-0 z-50 h-screen w-72 p-4 transition-transform md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
      </aside>
    </>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">TradeHub Pro</p>
        <h2 className="mt-2 text-xl font-semibold">Indian Trading Desk</h2>
      </div>

      <nav className="mt-8 space-y-2">
        {links.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                active
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-zinc-300 hover:bg-zinc-800/70",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto" />
    </div>
  );
}
