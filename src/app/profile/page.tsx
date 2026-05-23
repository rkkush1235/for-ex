"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const { appUser } = useAuth();

  return (
    <AppShell title="Profile">
      <section className="glass max-w-xl space-y-2 p-4 text-sm">
        <p>Name: {appUser?.displayName}</p>
        <p>Email: {appUser?.email}</p>
        <p>Role: {appUser?.role}</p>
        <p>User ID: {appUser?.uid}</p>
      </section>
    </AppShell>
  );
}
