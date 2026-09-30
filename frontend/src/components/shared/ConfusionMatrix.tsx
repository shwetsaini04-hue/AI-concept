"use client";

import type { BinaryCounts } from "@/lib/metrics/classification";
import { cn } from "@/lib/utils";

/** Editable 2×2 confusion matrix. Rows = actual, columns = predicted. */
export function ConfusionMatrix2({
  counts,
  onChange,
  posLabel = "Interested",
  negLabel = "Not interested",
}: {
  counts: BinaryCounts;
  onChange?: (c: BinaryCounts) => void;
  posLabel?: string;
  negLabel?: string;
}) {
  const cell = (k: keyof BinaryCounts, label: string, cls: string) => (
    <div className={cn("flex flex-col items-center justify-center rounded-md p-3", cls)}>
      <div className="text-[11px] font-semibold">{label}</div>
      {onChange ? (
        <input
          type="number"
          min={0}
          value={counts[k]}
          onChange={(e) => onChange({ ...counts, [k]: Math.max(0, Number(e.target.value) || 0) })}
          className="no-spin w-20 rounded border bg-card/80 text-center font-mono text-xl font-semibold"
          aria-label={label}
        />
      ) : (
        <div className="font-mono text-xl font-semibold">{counts[k]}</div>
      )}
    </div>
  );
  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-center text-xs">
      <div />
      <div className="py-1 font-medium text-muted-foreground">Pred: {posLabel}</div>
      <div className="py-1 font-medium text-muted-foreground">Pred: {negLabel}</div>
      <div className="flex items-center pr-1 font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180">Actual: {posLabel}</div>
      {cell("tp", "TP", "bg-success-soft text-success")}
      {cell("fn", "FN", "bg-warning-soft text-warning")}
      <div className="flex items-center pr-1 font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180">Actual: {negLabel}</div>
      {cell("fp", "FP", "bg-danger-soft text-danger")}
      {cell("tn", "TN", "bg-muted")}
    </div>
  );
}

/** Read-only K×K confusion matrix with per-cell shading. matrix[gold][pred]. */
export function ConfusionMatrixK({ labels, matrix, onChange }: { labels: string[]; matrix: number[][]; onChange?: (m: number[][]) => void }) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="overflow-x-auto">
      <table className="text-center font-mono text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-[10px] font-medium text-muted-foreground">gold ↓ / pred →</th>
            {labels.map((l) => (
              <th key={l} className="px-2 py-1 font-medium">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <th className="px-2 py-1 text-left font-medium">{labels[i]}</th>
              {row.map((v, j) => (
                <td key={j} className="p-0.5">
                  <div
                    className={cn("rounded px-2 py-1.5", i === j ? "text-success" : v ? "text-danger" : "text-muted-foreground")}
                    style={{ background: i === j ? `color-mix(in oklab, var(--success) ${Math.round((v / max) * 35)}%, transparent)` : `color-mix(in oklab, var(--danger) ${Math.round((v / max) * 35)}%, transparent)` }}
                  >
                    {onChange ? (
                      <input
                        type="number"
                        min={0}
                        value={v}
                        onChange={(e) => onChange(matrix.map((r, a) => r.map((x, b) => (a === i && b === j ? Math.max(0, Number(e.target.value) || 0) : x))))}
                        className="no-spin w-14 bg-transparent text-center font-semibold outline-none"
                        aria-label={`gold ${labels[i]} predicted ${labels[j]}`}
                      />
                    ) : (
                      v
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
