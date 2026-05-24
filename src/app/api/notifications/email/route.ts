import { NextResponse } from "next/server";
import {
  sendApprovalEmail,
  sendDepositEmail,
  sendRejectionEmail,
  sendWithdrawalEmail,
} from "@/lib/resend";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    let result: { ok: boolean; error?: string } = { ok: false, error: "Invalid email type" };

    if (body.type === "approval") {
      result = await sendApprovalEmail({
        to: body.to,
        name: body.name,
        accountId: body.accountId ?? "N/A",
      });
    }

    if (body.type === "rejection") {
      result = await sendRejectionEmail({
        to: body.to,
        name: body.name,
        reason: body.reason,
      });
    }

    if (body.type === "deposit") {
      result = await sendDepositEmail({
        to: body.to,
        name: body.name,
        amount: Number(body.amount ?? 0),
        status: String(body.status ?? "updated"),
      });
    }

    if (body.type === "withdrawal") {
      result = await sendWithdrawalEmail({
        to: body.to,
        name: body.name,
        amount: Number(body.amount ?? 0),
        status: String(body.status ?? "updated"),
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
