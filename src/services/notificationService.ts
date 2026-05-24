export async function sendSystemEmail(payload: {
  type: "approval" | "rejection" | "deposit" | "withdrawal";
  to: string;
  name?: string;
  accountId?: string;
  reason?: string;
  amount?: number;
  status?: string;
}) {
  try {
    await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return;
  }
}
