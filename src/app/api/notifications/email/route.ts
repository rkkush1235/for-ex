import { NextResponse } from "next/server";
import {
  sendApprovalEmail,
  sendDepositEmail,
  sendRejectionEmail,
  sendWithdrawalEmail,
} from "@/lib/resend";

function cleanString(input: unknown) {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = cleanString(body.type);
    const to = cleanString(body.to);

    if (!type) {
      return NextResponse.json({ ok: false, error: "Email type is required" }, { status: 400 });
    }

    if (!to) {
      return NextResponse.json({ ok: false, error: "Recipient email is required" }, { status: 400 });
    }

    let result: { ok: boolean; error?: string } = { ok: false, error: "Invalid email type" };

    if (type === "approval") {
      result = await sendApprovalEmail({
        to,
        name: cleanString(body.name),
        accountId: cleanString(body.accountId) ?? "N/A",
        loginEmail: cleanString(body.loginEmail) ?? to,
        originalPassword: cleanString(body.originalPassword) ?? "N/A",
      });
    }

    if (type === "rejection") {
      result = await sendRejectionEmail({
        to,
        name: cleanString(body.name),
        reason: cleanString(body.reason),
      });
    }

    if (type === "deposit") {
      result = await sendDepositEmail({
        to,
        name: cleanString(body.name),
        amount: Number(body.amount ?? 0),
        status: cleanString(body.status) ?? "updated",
      });
    }

    if (type === "withdrawal") {
      result = await sendWithdrawalEmail({
        to,
        name: cleanString(body.name),
        amount: Number(body.amount ?? 0),
        status: cleanString(body.status) ?? "updated",
      });
    }

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "Email send failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Email API] Failed to process request", error);
    return NextResponse.json({ ok: false, error: "Email API failure" }, { status: 500 });
  }
}
