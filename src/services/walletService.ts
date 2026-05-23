import { newId, readLocalDb, subscribeLocalDb, writeLocalDb } from "@/services/localDb";
import { DepositRequest, Transaction, WithdrawalRequest } from "@/types";

export async function createDepositRequest(input: {
  userId: string;
  amount: number;
  upiId: string;
  screenshotUrl: string;
}) {
  const now = Date.now();
  const row: DepositRequest = {
    id: newId("deposit"),
    ...input,
    status: "pending",
    createdAt: now,
  };

  writeLocalDb((prev) => ({
    ...prev,
    deposits: [row, ...prev.deposits],
  }));
}

export async function createWithdrawalRequest(input: {
  userId: string;
  amount: number;
  upiId: string;
  accountNumber: string;
  ifscCode: string;
}) {
  const now = Date.now();
  const row: WithdrawalRequest = {
    id: newId("withdraw"),
    ...input,
    status: "pending",
    createdAt: now,
  };

  writeLocalDb((prev) => ({
    ...prev,
    withdrawals: [row, ...prev.withdrawals],
  }));
}

export function subscribeTransactions(userId: string, onData: (rows: Transaction[]) => void) {
  const emit = () => {
    const rows = readLocalDb()
      .transactions
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
    onData(rows);
  };

  emit();
  return subscribeLocalDb(() => {
    emit();
  });
}

export function subscribeDeposits(onData: (rows: DepositRequest[]) => void, userId?: string) {
  const emit = () => {
    const all = readLocalDb().deposits;
    const rows = (userId ? all.filter((item) => item.userId === userId) : all).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    onData(rows);
  };

  emit();
  return subscribeLocalDb(() => {
    emit();
  });
}

export function subscribeWithdrawals(
  onData: (rows: WithdrawalRequest[]) => void,
  userId?: string,
) {
  const emit = () => {
    const all = readLocalDb().withdrawals;
    const rows = (userId ? all.filter((item) => item.userId === userId) : all).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    onData(rows);
  };

  emit();
  return subscribeLocalDb(() => {
    emit();
  });
}

export async function reviewDeposit(input: {
  requestId: string;
  userId: string;
  amount: number;
  adminId: string;
  status: "approved" | "rejected";
}) {
  const now = Date.now();
  writeLocalDb((prev) => {
    const deposits = prev.deposits.map((row) =>
      row.id === input.requestId
        ? { ...row, status: input.status, reviewedBy: input.adminId, reviewedAt: now }
        : row,
    );

    const wallet =
      prev.wallets[input.userId] ??
      ({ userId: input.userId, balance: 100_000, locked: 0, updatedAt: now } as const);

    const approved = input.status === "approved";
    const nextWallet = approved
      ? { ...wallet, balance: wallet.balance + input.amount, updatedAt: now }
      : wallet;

    const transactions = approved
      ? [
          {
            id: newId("tx"),
            userId: input.userId,
            type: "deposit",
            amount: input.amount,
            status: "approved",
            createdAt: now,
            note: "Deposit approved",
          } as Transaction,
          ...prev.transactions,
        ]
      : prev.transactions;

    return {
      ...prev,
      deposits,
      wallets: {
        ...prev.wallets,
        [input.userId]: nextWallet,
      },
      transactions,
    };
  });
}

export async function reviewWithdrawal(input: {
  requestId: string;
  userId: string;
  amount: number;
  adminId: string;
  status: "approved" | "rejected";
}) {
  const now = Date.now();
  writeLocalDb((prev) => {
    const withdrawals = prev.withdrawals.map((row) =>
      row.id === input.requestId
        ? { ...row, status: input.status, reviewedBy: input.adminId, reviewedAt: now }
        : row,
    );

    const wallet =
      prev.wallets[input.userId] ??
      ({ userId: input.userId, balance: 100_000, locked: 0, updatedAt: now } as const);

    const approved = input.status === "approved";
    const nextWallet = approved
      ? { ...wallet, balance: wallet.balance - input.amount, updatedAt: now }
      : wallet;

    const transactions = approved
      ? [
          {
            id: newId("tx"),
            userId: input.userId,
            type: "withdrawal",
            amount: input.amount,
            status: "approved",
            createdAt: now,
            note: "Withdrawal approved",
          } as Transaction,
          ...prev.transactions,
        ]
      : prev.transactions;

    return {
      ...prev,
      withdrawals,
      wallets: {
        ...prev.wallets,
        [input.userId]: nextWallet,
      },
      transactions,
    };
  });
}

export async function adjustWallet(input: { userId: string; balance: number; locked?: number }) {
  const now = Date.now();
  writeLocalDb((prev) => ({
    ...prev,
    wallets: {
      ...prev.wallets,
      [input.userId]: {
        userId: input.userId,
        balance: input.balance,
        locked: input.locked ?? 0,
        updatedAt: now,
      },
    },
    transactions: [
      {
        id: newId("tx"),
        userId: input.userId,
        type: "admin_adjustment",
        amount: input.balance,
        status: "completed",
        createdAt: now,
        note: "Admin wallet adjustment",
      },
      ...prev.transactions,
    ],
  }));
}
