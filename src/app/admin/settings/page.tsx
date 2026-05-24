"use client";

import { AdminRoute } from "@/components/guards/AdminRoute";
import { AppShell } from "@/components/layout/AppShell";

export default function AdminSettingsPage() {
  return (
    <AdminRoute>
      <AppShell title="Admin Settings">
        <section className="glass space-y-3 p-4 text-sm">
          <h3 className="font-medium">Email & Compliance Settings</h3>
          <p className="text-zinc-400">Configure these env variables for notification workflow:</p>
          <ul className="space-y-1 text-zinc-300">
            <li>RESEND_API_KEY</li>
            <li>RESEND_FROM_EMAIL</li>
            <li>NEXT_PUBLIC_APP_URL</li>
          </ul>
          <p className="text-xs text-zinc-500">Admin role assignment remains manual via Firestore users document.</p>
        </section>
      </AppShell>
    </AdminRoute>
  );
}
