"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useCreateDepositRequest, useDeposits } from "@/hooks/useWalletRequests";
import { ADMIN_BANK_DETAILS, ADMIN_UPI_ID } from "@/utils/constants";
import { uploadDepositScreenshot } from "@/firebase/storage";

const schema = z.object({
  amount: z.number().min(100),
  upiId: z.string().min(3),
});

type FormData = z.infer<typeof schema>;

export default function DepositPage() {
  const { appUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const createDeposit = useCreateDepositRequest();
  const rows = useDeposits(appUser?.uid);

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { upiId: "" },
  });

  const qrPayload = `upi://pay?pa=${encodeURIComponent(ADMIN_UPI_ID)}&pn=${encodeURIComponent("Forex Admin")}&cu=INR`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrPayload)}`;

  const onSubmit = async (data: FormData) => {
    if (!appUser?.uid || !file) return;
    const screenshotUrl = await uploadDepositScreenshot(appUser.uid, file);
    await createDeposit.mutateAsync({
      userId: appUser.uid,
      amount: data.amount,
      upiId: data.upiId,
      screenshotUrl,
    });
  };

  return (
    <AppShell title="Deposit">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass space-y-3 p-4">
          <h3 className="text-sm font-medium">Payment Details</h3>
          <div className="rounded-lg bg-zinc-900/70 p-3 text-sm">
            <p>UPI: {ADMIN_UPI_ID}</p>
            <p>Account: {ADMIN_BANK_DETAILS.accountNumber}</p>
            <p>IFSC: {ADMIN_BANK_DETAILS.ifsc}</p>
            <p>Bank: {ADMIN_BANK_DETAILS.bank}</p>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-2">
            <img
              src={qrImageUrl}
              alt="Deposit QR code"
              width={220}
              height={220}
              className="h-44 w-44 rounded-lg object-contain"
            />
          </div>
        </section>

        <form onSubmit={handleSubmit(onSubmit)} className="glass space-y-3 p-4">
          <h3 className="text-sm font-medium">Submit Deposit Request</h3>
          <input
            type="number"
            placeholder="Amount"
            {...register("amount", { valueAsNumber: true })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
          />
          <input
            placeholder="Your UPI ID"
            {...register("upiId")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full rounded-lg bg-emerald-500 px-3 py-2 font-medium text-zinc-900"
          >
            {formState.isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>

      <section className="glass p-4">
        <h3 className="mb-3 text-sm font-medium">Deposit History</h3>
        <div className="space-y-2 text-sm">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-zinc-700/70 p-3">
              ₹{row.amount} • {row.status} • {new Date(row.createdAt).toLocaleString()}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
