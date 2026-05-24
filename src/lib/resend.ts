import "server-only";

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const resend = apiKey ? new Resend(apiKey) : null;

function emailShell(title: string, subtitle: string, bodyHtml: string) {
  return `
    <div style="background:#070a11;padding:24px;font-family:Inter,Arial,sans-serif;color:#e4e4e7;">
      <div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;background:linear-gradient(90deg,#10b981,#34d399);color:#0b1220;">
          <h1 style="margin:0;font-size:18px;font-weight:700;">${title}</h1>
          <p style="margin:6px 0 0 0;font-size:13px;opacity:.9;">${subtitle}</p>
        </div>
        <div style="padding:24px;line-height:1.65;font-size:14px;color:#e5e7eb;">
          ${bodyHtml}
        </div>
      </div>
    </div>
  `;
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend || !fromEmail) {
    console.error("[Email] Resend is not configured. Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
    return { ok: false as const, error: "Resend not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    });

    if (result.error) {
      console.error("[Email] Resend send failed", result.error);
      return { ok: false as const, error: result.error.message ?? "Resend send failed" };
    }

    return { ok: true as const, id: result.data?.id };
  } catch (error) {
    console.error("[Email] Unexpected send error", error);
    return { ok: false as const, error: "Unexpected email send error" };
  }
}

export async function sendApprovalEmail(input: {
  to: string;
  name?: string;
  accountId: string;
}) {
  const loginUrl = `${appUrl}/login`;
  return sendEmail({
    to: input.to,
    subject: "Your AstraTrade account is approved",
    html: emailShell(
      "Account Approved ✅",
      "Welcome to AstraTrade India",
      `<p>Hi ${input.name ?? "Trader"},</p>
       <p>Your KYC is verified and your trading account is now active.</p>
       <p style="margin:12px 0;padding:12px;border:1px solid #3f3f46;border-radius:10px;background:#09090b;">
         <strong>Trading Account ID:</strong> ${input.accountId}
       </p>
       <p>
         <a href="${loginUrl}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#10b981;color:#062e25;text-decoration:none;font-weight:600;">
           Login to AstraTrade
         </a>
       </p>
      <p style="margin-top:16px;">Happy trading in USD $.</p>`,
    ),
  });
}

export async function sendRejectionEmail(input: {
  to: string;
  name?: string;
  reason?: string;
}) {
  return sendEmail({
    to: input.to,
    subject: "Your AstraTrade KYC was rejected",
    html: emailShell(
      "KYC Update",
      "Action required on your account",
      `<p>Hi ${input.name ?? "Trader"},</p>
       <p>Your KYC review was not approved.</p>
       <p style="margin:12px 0;padding:12px;border:1px solid #3f3f46;border-radius:10px;background:#09090b;">
         <strong>Reason:</strong> ${input.reason ?? "KYC verification failed"}
       </p>
       <p>Please update documents and contact support to continue.</p>`,
    ),
  });
}

export async function sendDepositEmail(input: {
  to: string;
  name?: string;
  amount: number;
  status: string;
}) {
  return sendEmail({
    to: input.to,
    subject: "Deposit request update",
    html: emailShell(
      "Deposit Update",
      "Your deposit request status changed",
      `<p>Hi ${input.name ?? "Trader"},</p>
      <p>Your deposit request of <strong>$${input.amount.toFixed(2)}</strong> is now <strong>${input.status.toUpperCase()}</strong>.</p>
       <p>You can check wallet and transactions in your dashboard.</p>`,
    ),
  });
}

export async function sendWithdrawalEmail(input: {
  to: string;
  name?: string;
  amount: number;
  status: string;
}) {
  return sendEmail({
    to: input.to,
    subject: "Withdrawal request update",
    html: emailShell(
      "Withdrawal Update",
      "Your withdrawal request status changed",
      `<p>Hi ${input.name ?? "Trader"},</p>
      <p>Your withdrawal request of <strong>$${input.amount.toFixed(2)}</strong> is now <strong>${input.status.toUpperCase()}</strong>.</p>
       <p>Check your wallet page for latest updates.</p>`,
    ),
  });
}
