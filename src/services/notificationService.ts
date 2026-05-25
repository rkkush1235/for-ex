export async function sendSystemEmail(payload: {
  type: "approval" | "rejection" | "deposit" | "withdrawal";
  to: string;
  name?: string;
  accountId?: string;
  loginEmail?: string;
  originalPassword?: string;
  reason?: string;
  amount?: number;
  status?: string;
}) {
  try {
    const response = await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return { ok: false as const, error: body?.error ?? "Email request failed" };
    }

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Email API is unreachable" };
  }
}
