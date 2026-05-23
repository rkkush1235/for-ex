import { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="glass p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400">{label}</p>
          <h3 className="mt-2 text-xl font-semibold">{value}</h3>
          {hint ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
        </div>
        {icon}
      </div>
    </div>
  );
}
