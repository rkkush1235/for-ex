import { Transaction } from "@/types";
import { formatCurrency } from "@/utils/format";

export function TransactionsTable({ rows }: { rows: Transaction[] }) {
  return (
    <div className="glass overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs text-zinc-400">
          <tr>
            <th className="p-3">Type</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Status</th>
            <th className="p-3">Date</th>
            <th className="p-3">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => (
            <tr key={tx.id} className="border-t border-zinc-800/80">
              <td className="p-3 capitalize">{tx.type.replace("_", " ")}</td>
              <td className={`p-3 ${tx.amount >= 0 ? "badge-up" : "badge-down"}`}>
                {formatCurrency(tx.amount)}
              </td>
              <td className="p-3 capitalize">{tx.status}</td>
              <td className="p-3">{new Date(tx.createdAt).toLocaleString()}</td>
              <td className="p-3 text-zinc-400">{tx.note ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
