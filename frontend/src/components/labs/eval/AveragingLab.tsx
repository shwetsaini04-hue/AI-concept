"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Button, Card, CardContent, CardHeader, CardTitle, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { ConfusionMatrixK } from "@/components/shared/ConfusionMatrix";
import { multiClassReport } from "@/lib/metrics/classification";
import { pct } from "@/lib/utils";

const LABELS = ["Interested", "Not Interested", "Ambiguous"];

const PRESETS: Record<string, number[][]> = {
  "Ignores the rare class": [
    [780, 15, 5],
    [20, 125, 5],
    [40, 8, 2],
  ],
  "Balanced performance": [
    [720, 50, 30],
    [15, 125, 10],
    [5, 5, 40],
  ],
  "Always predicts Interested": [
    [800, 0, 0],
    [150, 0, 0],
    [50, 0, 0],
  ],
};

export default function AveragingLab() {
  const [m, setM] = useState<number[][]>(PRESETS["Ignores the rare class"]);
  const r = useMemo(() => multiClassReport(LABELS, m), [m]);
  const chart = [
    { name: "Accuracy", v: r.accuracy },
    { name: "Micro-F1", v: r.micro.f1 },
    { name: "Weighted-F1", v: r.weighted.f1 },
    { name: "Macro-F1", v: r.macro.f1 },
  ];
  const colors = ["var(--muted-foreground)", "var(--info)", "var(--warning)", "var(--primary)"];
  const support = r.perClass.map((c) => c.support);
  const total = support.reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Imbalanced 3-class dataset</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Class mix: {r.perClass.map((c) => `${c.label} ${pct(c.support / total)}`).join(" · ")}. Edit any cell of the confusion matrix.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ModeBadge mode="computed" />
            {Object.keys(PRESETS).map((k) => (
              <Button key={k} size="sm" variant="outline" onClick={() => setM(PRESETS[k].map((row) => [...row]))}>
                {k}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <ConfusionMatrixK labels={LABELS} matrix={m} onChange={setM} />
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1">Class</th>
                  <th className="py-1 text-right">Precision</th>
                  <th className="py-1 text-right">Recall</th>
                  <th className="py-1 text-right">F1</th>
                  <th className="py-1 text-right">Support</th>
                </tr>
              </thead>
              <tbody>
                {r.perClass.map((c) => (
                  <tr key={c.label} className="border-t">
                    <td className="py-1.5">{c.label}</td>
                    <td className="py-1.5 text-right font-mono">{c.precision.toFixed(2)}</td>
                    <td className="py-1.5 text-right font-mono">{c.recall.toFixed(2)}</td>
                    <td className="py-1.5 text-right font-mono">{c.f1.toFixed(2)}</td>
                    <td className="py-1.5 text-right font-mono">{c.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={chart} margin={{ left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => Number(v).toFixed(3)} />
                  <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                    {chart.map((_, i) => (
                      <Cell key={i} fill={colors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 rounded-lg border p-3 font-mono text-xs">
              <div>micro-F1 = F1(ΣTP, ΣFP, ΣFN) = {r.micro.f1.toFixed(3)} <span className="text-muted-foreground">(= accuracy for single-label)</span></div>
              <div>weighted-F1 = Σ (nₖ/N)·F1ₖ = {r.weighted.f1.toFixed(3)}</div>
              <div>macro-F1 = (1/K) Σ F1ₖ = ({r.perClass.map((c) => c.f1.toFixed(2)).join(" + ")}) / 3 = {r.macro.f1.toFixed(3)}</div>
            </div>
            <Callout tone={r.micro.f1 - r.macro.f1 > 0.2 ? "warning" : "info"}>
              Gap between micro and macro: <b>{(r.micro.f1 - r.macro.f1).toFixed(3)}</b>.{" "}
              {r.micro.f1 - r.macro.f1 > 0.2
                ? "Micro/weighted numbers look great because they're dominated by the 80% class. Macro reveals that the rare class — often the one the business cares about — is failing."
                : "When every class performs similarly, the averages converge."}
            </Callout>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
