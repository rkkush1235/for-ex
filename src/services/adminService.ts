import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { AppUser, DashboardAnalytics } from "@/types";

const usersCol = collection(db, "users");

export function subscribeUsers(
  onData: (rows: AppUser[]) => void,
  onError?: (error: unknown) => void,
) {
  const q = query(usersCol, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as AppUser));
    },
    (error) => onError?.(error),
  );
}

export function subscribeAnalytics(onData: (data: DashboardAnalytics) => void) {
  onData({
    totalUsers: 0,
    openTrades: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    marketUpdatedAt: Date.now(),
  });

  return () => {};
}
