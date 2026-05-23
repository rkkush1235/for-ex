"use client";

import { useEffect, useState } from "react";
import { subscribeUsers, subscribeAnalytics } from "@/services/adminService";
import { AppUser, DashboardAnalytics } from "@/types";

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    const unsub = subscribeUsers(setUsers, () => {
      setUsers([]);
    });
    return () => unsub();
  }, []);

  return users;
}

export function useAnalytics() {
  const [data, setData] = useState<DashboardAnalytics>({
    totalUsers: 0,
    openTrades: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    marketUpdatedAt: Date.now(),
  });

  useEffect(() => {
    const unsub = subscribeAnalytics(setData);
    return () => unsub();
  }, []);

  return data;
}
