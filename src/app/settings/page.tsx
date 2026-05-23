"use client";

import { AppShell } from "@/components/layout/AppShell";

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <section className="glass max-w-xl space-y-3 p-4 text-sm text-zinc-300">
        <p>Theme: Dark trading mode</p>
        <p>Market refresh: 8 seconds shared polling</p>
        <p>Currency display: INR ₹</p>
        <p>Realtime updates: Firebase onSnapshot listeners</p>
      </section>
    </AppShell>
  );
}
