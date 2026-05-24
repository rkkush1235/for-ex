"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { TRADED_ASSETS } from "@/utils/constants";
import { useCloseTrade, usePlaceTrade, useTrades } from "@/hooks/useTrading";
import { TradesTable } from "@/components/trades/TradesTable";
import { useMarketData } from "@/hooks/useMarketData";
import { TradingChart } from "@/charts/TradingChart";
import { getMarketStatus, inferMarketCategory } from "@/utils/marketHours";


const schema = z.object({
  asset: z.string().min(1),
  type: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
});

type FormData = z.infer<typeof schema>;

export default function TradingPage() {
  const { appUser } = useAuth();
  const { selectedAsset: storeSelectedAsset, setSelectedAsset } = useAppStore();
  const market = useMarketData();
  const trades = useTrades(appUser?.uid);
  const place = usePlaceTrade();
  const close = useCloseTrade();

  const { register, handleSubmit, watch, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { asset: storeSelectedAsset, type: "buy", quantity: 1 },
  });

  const activeAsset = watch("asset") ?? storeSelectedAsset;
  const activeCategory = market.prices[activeAsset]?.category ?? inferMarketCategory(activeAsset);
  const marketStatus = getMarketStatus(activeCategory);

  const onSubmit = async (data: FormData) => {
    if (!appUser?.uid) return;
    await place.mutateAsync({ userId: appUser.uid, ...data });
    setSelectedAsset(data.asset);
  };

  return (
    <AppShell title="Trading">
      <form onSubmit={handleSubmit(onSubmit)} className="glass grid gap-3 p-4 md:grid-cols-4">
        <select
          {...register("asset")}
          className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
        >
          {TRADED_ASSETS.map((asset) => (
            <option key={asset} value={asset}>
              {asset}
            </option>
          ))}
        </select>
        <select
          {...register("type")}
          className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <input
          type="number"
          step="0.01"
          {...register("quantity", { valueAsNumber: true })}
          className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2"
        />
        <button
          disabled={formState.isSubmitting || !marketStatus.isOpen}
          className="rounded-lg bg-emerald-500 px-3 py-2 font-medium text-zinc-900"
          type="submit"
        >
          {!marketStatus.isOpen ? "Market Closed" : formState.isSubmitting ? "Placing..." : "Place Trade"}
        </button>
        {!marketStatus.isOpen ? (
          <p className="md:col-span-4 text-xs text-red-400">{marketStatus.message}</p>
        ) : null}
      </form>

      <TradingChart />

      <TradesTable
        trades={trades}
        priceMap={market.prices}
        onClose={async (trade) => {
          await close.mutateAsync(trade);
        }}
      />
    </AppShell>
  );
}
