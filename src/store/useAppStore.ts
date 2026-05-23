import { create } from "zustand";

interface AppState {
  selectedSymbol: string;
  selectedAsset: string;
  selectedOrderType: "buy" | "sell";
  sidebarOpen: boolean;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedAsset: (asset: string) => void;
  setSelectedOrderType: (type: "buy" | "sell") => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedSymbol: "EURUSD",
  selectedAsset: "EUR/USD",
  selectedOrderType: "buy",
  sidebarOpen: false,
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol, selectedAsset: selectedSymbol }),
  setSelectedAsset: (selectedAsset) => set({ selectedAsset, selectedSymbol: selectedAsset }),
  setSelectedOrderType: (selectedOrderType) => set({ selectedOrderType }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
