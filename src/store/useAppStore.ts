import { create } from "zustand";

interface AppState {
  selectedSymbol: string;
  selectedAsset: string;
  sidebarOpen: boolean;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedAsset: (asset: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedSymbol: "EURUSD",
  selectedAsset: "EUR/USD",
  sidebarOpen: false,
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol, selectedAsset: selectedSymbol }),
  setSelectedAsset: (selectedAsset) => set({ selectedAsset, selectedSymbol: selectedAsset }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
