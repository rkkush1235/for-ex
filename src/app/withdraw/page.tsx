"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useCreateWithdrawalRequest, useWithdrawals } from "@/hooks/useWalletRequests";

const schema = z.object({
  amount: z.number().min(100),
  upiId: z.string().min(3),
  accountNumber: z.string().min(8),
  ifscCode: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function WithdrawPage() {
  const { appUser } = useAuth();
  const createWithdrawal = useCreateWithdrawalRequest();
  const rows = useWithdrawals(appUser?.uid);

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!appUser?.uid) return;
    await createWithdrawal.mutateAsync({
      userId: appUser.uid,
      amount: data.amount,
      upiId: data.upiId,
      accountNumber: data.accountNumber,
      ifscCode: data.ifscCode,
    });
  };

  return (
    <AppShell title="Withdraw">
      <form onSubmit={handleSubmit(onSubmit)} className="glass mx-auto w-full max-w-xl space-y-3 p-4">
        <h3 className="text-sm font-medium">Withdrawal Request</h3>
        <input
          type="number"
          placeholder="Amount"
          {...register("amount", { valueAsNumber: true })}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
        />
        <input
          placeholder="UPI ID"
          {...register("upiId")}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
        />
        <input
          placeholder="Account Number"
          {...register("accountNumber")}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
        />
        <input
          placeholder="IFSC Code"
          {...register("ifscCode")}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
        />
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="w-full rounded-lg bg-emerald-500 px-3 py-2 font-medium text-zinc-900"
        >
          {formState.isSubmitting ? "Submitting..." : "Submit Withdrawal"}
        </button>
      </form>

      <section className="glass p-4">
        <h3 className="mb-3 text-sm font-medium">Withdrawal History</h3>
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
