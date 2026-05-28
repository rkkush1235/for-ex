"use client";

import { useMemo, useState } from "react";
import { LeverageSelector } from "@/components/wallet/LeverageSelector";
import { cn, formatCurrency, safeNumber } from "@/utils/format";

const leverageOptions = [20, 50, 100, 200, 300];

function getRiskLevel(leverage: number) {
  if (leverage <= 20) return { label: "Low", width: "w-1/3", color: "bg-emerald-500" };
  if (leverage <= 50) return { label: "Medium", width: "w-2/3", color: "bg-amber-500" };
  return { label: "High", width: "w-full", color: "bg-red-500" };
}

export function LeverageTradingCard({ walletBalance }: { walletBalance: number }) {
  const [selectedLeverage, setSelectedLeverage] = useState(100);
  const [positionAmount, setPositionAmount] = useState(safeNumber(walletBalance));
  const [side, setSide] = useState<"buy" | "sell">("buy");

  const safeWalletBalance = safeNumber(walletBalance);
  const availableMargin = safeWalletBalance;
  const totalBuyingPower = useMemo(
    () => safeNumber(safeWalletBalance * selectedLeverage, 0, 1e15),
    [safeWalletBalance, selectedLeverage],
  );
  const companyMargin = useMemo(
    () => safeNumber(Math.max(0, totalBuyingPower - safeWalletBalance), 0, 1e15),
    [safeWalletBalance, totalBuyingPower],
  );

  const safePositionAmount = safeNumber(positionAmount, 0, 1e12);
  const estimatedExposure = useMemo(
    () => safeNumber(safePositionAmount * selectedLeverage, 0, 1e15),
    [safePositionAmount, selectedLeverage],
  );

  const risk = getRiskLevel(selectedLeverage);
  const leverageIndex = leverageOptions.indexOf(selectedLeverage);

  return (
    <section className="glass space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Leverage Trading</h3>
          <p className="text-xs text-zinc-400">Demo calculations only • no backend execution</p>
        </div>
        <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-300">
          Max Exposure {selectedLeverage}x
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/60 p-3">
          <p className="text-xs text-zinc-400">User Wallet Balance</p>
          <p className="mt-1 text-base font-semibold">{formatCurrency(safeWalletBalance, "INR")}</p>
        </div>
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/60 p-3">
          <p className="text-xs text-zinc-400">Available Margin</p>
          <p className="mt-1 text-base font-semibold">{formatCurrency(availableMargin, "INR")}</p>
        </div>
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/60 p-3">
          <p className="text-xs text-zinc-400">Company Provided Margin</p>
          <p className="mt-1 text-base font-semibold text-cyan-300">{formatCurrency(companyMargin, "INR")}</p>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-200">
        Leveraged funds are temporarily provided by platform for amplified trading exposure.
        These are virtual buying power limits, not actual wallet funds.
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-700/80 bg-zinc-950/50 p-3">
        <LeverageSelector
          options={leverageOptions}
          selected={selectedLeverage}
          onChange={setSelectedLeverage}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <p>Animated Leverage Slider</p>
            <p>{selectedLeverage}x</p>
          </div>
          <input
            type="range"
            min={0}
            max={leverageOptions.length - 1}
            step={1}
            value={Math.max(0, leverageIndex)}
            onChange={(event) => {
              const nextIndex = Number(event.target.value);
              setSelectedLeverage(leverageOptions[nextIndex] ?? leverageOptions[0]);
            }}
            className="w-full accent-emerald-500"
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3 rounded-xl border border-zinc-700/80 bg-zinc-950/50 p-3">
          <p className="text-xs font-medium text-zinc-300">Trade Entry</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition",
                side === "buy"
                  ? "bg-emerald-500 text-zinc-900"
                  : "border border-zinc-700 bg-zinc-900/70 text-zinc-300",
              )}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition",
                side === "sell"
                  ? "bg-red-500 text-white"
                  : "border border-zinc-700 bg-zinc-900/70 text-zinc-300",
              )}
            >
              Sell
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-zinc-400">
              Position Size
              <input
                type="number"
                min={0}
                step="0.01"
                value={safePositionAmount}
                onChange={(event) => setPositionAmount(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2">
              <p className="text-xs text-zinc-400">Selected Leverage</p>
              <p className="text-sm font-semibold text-emerald-300">{selectedLeverage}x</p>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="text-xs text-zinc-300">Estimated Exposure</p>
            <p className="mt-1 text-base font-semibold text-emerald-300">
              {formatCurrency(estimatedExposure, "INR")}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {side.toUpperCase()} {formatCurrency(safePositionAmount, "INR")} × {selectedLeverage} = {formatCurrency(estimatedExposure, "INR")}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-700/80 bg-zinc-950/50 p-3">
          <p className="text-xs font-medium text-zinc-300">Liquidation Preview</p>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            Higher leverage increases liquidation risk and market volatility exposure.
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <p className="text-zinc-400">Estimated liquidation risk</p>
              <p
                className={cn(
                  "font-semibold",
                  risk.label === "Low"
                    ? "text-emerald-300"
                    : risk.label === "Medium"
                      ? "text-amber-300"
                      : "text-red-300",
                )}
              >
                {risk.label}
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div className={cn("h-full rounded-full transition-all duration-300", risk.width, risk.color)} />
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border border-zinc-700 bg-zinc-900/70 p-3 text-xs text-zinc-300">
            <p>Company Margin Access: up to 300x</p>
            <p>Total Buying Power: {formatCurrency(totalBuyingPower, "INR")}</p>
            <p>Profit Multiplier Preview: 1% move ≈ {selectedLeverage}% impact on position</p>
          </div>
        </div>
      </div>
    </section>
  );
}
