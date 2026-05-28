"use client";

import { cn } from "@/utils/format";

interface LeverageSelectorProps {
  options: number[];
  selected: number;
  onChange: (value: number) => void;
}

export function LeverageSelector({ options, selected, onChange }: LeverageSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <p>Leverage Selector</p>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
          {selected}x Active
        </span>
      </div>
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2 px-1">
          {options.map((value) => {
            const active = value === selected;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange(value)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200",
                  "hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-zinc-800/70",
                  active
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.35)]"
                    : "border-zinc-700 bg-zinc-900/70 text-zinc-300",
                )}
              >
                {value}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
