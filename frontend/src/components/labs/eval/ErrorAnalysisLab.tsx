"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ErrorBar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Badge, Card, CardContent, CardHeader, CardTitle, Label, Select, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { binaryMetrics } from "@/lib/metrics/classification";
import { bootstrapCI } from "@/lib/metrics/stats";
import { cn, pct, rng } from "@/lib/utils";

const DIMS = {
  agent: ["Agent A", "Agent B", "Agent C"],
  callType: ["inbound", "outbound"],
  language: ["English", "Hinglish", "Romanized Hindi"],
  quality: ["clean", "noisy", "very noisy"],
  duration: ["< 1 min", "1–5 min", "> 5 min"],
  segment: ["salaried", "self-employed", "student", "unknown"],
  model: ["Model-S", "Model-L"],
  prompt: ["v1", "v2"],
} as const;
type Dim = keyof typeof DIMS;
const DIM_LABEL: Record<Dim, string> = {
  agent: "Agent",
  callType: "Call type",
  language: "Language",
  quality: "Transcript quality",
  duration: "Call duration",
  segment: "Customer segment",
  model: "Model",
  prompt: "Prompt version",
};

type Row = Record<Dim, string> & { gold: boolean; pred: boolean };

function pickW<T>(xs: readonly T[], ws: number[], r: () => number): T {
  const s = ws.reduce((a, b) => a + b, 0);
  let x = r() * s;
  for (let i = 0; i < xs.length; i++) {
    x -= ws[i];
    if (x <= 0) return xs[i];
  }
  return xs[xs.length - 1];
}

function makeData(): Row[] {
  const r = rng(2024);
  const rows: Row[] = [];
  for (let i = 0; i < 900; i++) {
    const agent = pickW(DIMS.agent, [1, 1, 1], r);
    const callType = pickW(DIMS.callType, agent === "Agent B" ? [0.25, 0.75] : [0.55, 0.45], r);
    const quality = pickW(DIMS.quality, agent === "Agent B" ? [0.3, 0.45, 0.25] : agent === "Agent A" ? [0.7, 0.22, 0.08] : [0.6, 0.3, 0.1], r);
    const language = pickW(DIMS.language, [0.25, 0.55, 0.2], r);
    const duration = pickW(DIMS.duration, [0.2, 0.6, 0.2], r);
    const segment = pickW(DIMS.segment, [0.5, 0.25, 0.1, 0.15], r);
    const model = pickW(DIMS.model, [0.5, 0.5], r);
    const prompt = pickW(DIMS.prompt, [0.5, 0.5], r);
    const gold = r() < 0.32;
    let p = 0.95;
    if (quality === "noisy") p -= 0.11;
    if (quality === "very noisy") p -= 0.27;
    if (language === "Romanized Hindi" && model === "Model-S") p -= 0.1;
    if (prompt === "v2" && quality !== "clean") p += 0.05;
    if (duration === "> 5 min") p -= 0.03;
    if (model === "Model-L") p += 0.02;
    // errors on noisy calls are mostly missed positives (low recall)
    const correct = r() < p;
    const pred = correct ? gold : gold ? false : r() < 0.6;
    rows.push({ agent, callType, quality, language, duration, segment, model, prompt, gold, pred });
  }
  return rows;
}

const DATA = makeData();

function f1Of(rows: Row[]) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const x of rows) {
    if (x.pred && x.gold) tp++;
    else if (x.pred) fp++;
    else if (x.gold) fn++;
    else tn++;
  }
  return binaryMetrics({ tp, fp, fn, tn });
}

export default function ErrorAnalysisLab() {
  const [filters, setFilters] = useState<Partial<Record<Dim, string>>>({});
  const [groupBy, setGroupBy] = useState<Dim>("agent");
  const [crossBy, setCrossBy] = useState<Dim>("quality");
  const [answer, setAnswer] = useState<string | null>(null);

  const filtered = useMemo(() => DATA.filter((r) => (Object.entries(filters) as [Dim, string][]).every(([d, v]) => !v || r[d] === v)), [filters]);
  const overall = f1Of(filtered);

  const slices = useMemo(() => {
    const r = rng(9);
    return DIMS[groupBy].map((v) => {
      const rows = filtered.filter((x) => x[groupBy] === v);
      const m = f1Of(rows);
      const ci = rows.length > 5 ? bootstrapCI(rows.length, (idx) => f1Of(idx.map((i) => rows[i])).f1, r, 200) : ([0, 1] as [number, number]);
      return { v, n: rows.length, ...m, lo: ci[0], hi: ci[1], err: [m.f1 - ci[0], ci[1] - m.f1] };
    });
  }, [filtered, groupBy]);

  const cross = useMemo(
    () =>
      DIMS[groupBy].map((a) => ({
        a,
        cells: DIMS[crossBy].map((b) => {
          const rows = filtered.filter((x) => x[groupBy] === a && x[crossBy] === b);
          return { b, n: rows.length, f1: f1Of(rows).f1 };
        }),
      })),
    [filtered, groupBy, crossBy],
  );

  const QUIZ = [
    { t: "Agent B is a worse agent and needs retraining", ok: false },
    { t: "Agent B handles far more noisy transcripts; within each quality tier Agent B's F1 is similar to the others", ok: true },
    { t: "Model-L is worse than Model-S", ok: false },
    { t: "The sample is too small to say anything", ok: false },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Error-analysis dashboard</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">900 labelled predictions (positive class = interested). Filter, slice, and cross-tabulate to find root causes.</p>
          </div>
          <ModeBadge mode="simulated" detail="Synthetic predictions generated from a known causal model (so there is a right answer to find)." />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(DIMS) as Dim[]).map((d) => (
              <div key={d} className="space-y-1">
                <Label>{DIM_LABEL[d]}</Label>
                <Select value={filters[d] ?? ""} onChange={(e) => setFilters((f) => ({ ...f, [d]: e.target.value || undefined }))} className="w-full">
                  <option value="">All</option>
                  {DIMS[d].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              Filtered F1: {overall.f1.toFixed(2)} (P {overall.precision.toFixed(2)} · R {overall.recall.toFixed(2)})
            </Badge>
            <Badge variant="muted">n = {filtered.length}</Badge>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Slice by</Label>
                <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as Dim)}>
                  {(Object.keys(DIMS) as Dim[]).map((d) => (
                    <option key={d} value={d}>
                      {DIM_LABEL[d]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={slices} margin={{ left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="v" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => (Array.isArray(v) ? "" : Number(v).toFixed(2))} />
                    <Bar dataKey="f1" name="F1" radius={[4, 4, 0, 0]}>
                      {slices.map((s, i) => (
                        <Cell key={i} fill={s.f1 < overall.f1 - 0.08 ? "var(--danger)" : "var(--primary)"} />
                      ))}
                      <ErrorBar dataKey="err" width={6} stroke="var(--foreground)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1">{DIM_LABEL[groupBy]}</th>
                    <th className="py-1 text-right">n</th>
                    <th className="py-1 text-right">Precision</th>
                    <th className="py-1 text-right">Recall</th>
                    <th className="py-1 text-right">F1 [95% CI]</th>
                  </tr>
                </thead>
                <tbody>
                  {slices.map((s) => (
                    <tr key={s.v} className="border-t">
                      <td className="py-1.5">{s.v}</td>
                      <td className={cn("py-1.5 text-right font-mono", s.n < 40 && "text-warning")}>{s.n}</td>
                      <td className="py-1.5 text-right font-mono">{s.precision.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-mono">{s.recall.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-mono">
                        {s.f1.toFixed(2)} <span className="text-[10px] text-muted-foreground">[{s.lo.toFixed(2)}, {s.hi.toFixed(2)}]</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Cross with</Label>
                <Select value={crossBy} onChange={(e) => setCrossBy(e.target.value as Dim)}>
                  {(Object.keys(DIMS) as Dim[])
                    .filter((d) => d !== groupBy)
                    .map((d) => (
                      <option key={d} value={d}>
                        {DIM_LABEL[d]}
                      </option>
                    ))}
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 text-left text-muted-foreground">
                        {DIM_LABEL[groupBy]} ↓ / {DIM_LABEL[crossBy]} →
                      </th>
                      {DIMS[crossBy].map((b) => (
                        <th key={b} className="p-1 font-medium">
                          {b}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cross.map((row) => (
                      <tr key={row.a}>
                        <th className="p-1 text-left font-medium">{row.a}</th>
                        {row.cells.map((c) => (
                          <td key={c.b} className="p-0.5">
                            <div
                              className="rounded px-1 py-2 font-mono"
                              style={{ background: c.n ? `color-mix(in oklab, ${c.f1 >= 0.8 ? "var(--success)" : c.f1 >= 0.65 ? "var(--warning)" : "var(--danger)"} 28%, transparent)` : undefined }}
                            >
                              {c.n ? c.f1.toFixed(2) : "—"}
                              <div className="text-[9px] text-muted-foreground">n={c.n}</div>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">Cross-tabs separate a slice's effect from confounders. Cells with small n have wide uncertainty — don't over-read them.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Root-cause question</CardTitle>
          <p className="text-sm text-muted-foreground">Slice by Agent: Agent B looks clearly worse. Before retraining anyone, cross Agent with Transcript quality. What's going on?</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {QUIZ.map((q) => (
            <button
              key={q.t}
              onClick={() => setAnswer(q.t)}
              className={cn(
                "block w-full cursor-pointer rounded-md border px-3 py-2 text-left text-sm",
                answer === q.t && (q.ok ? "border-success bg-success-soft" : "border-danger bg-danger-soft"),
                answer && answer !== q.t && q.ok && "border-success/60",
              )}
            >
              {q.t}
            </button>
          ))}
          {answer && (
            <Callout tone={QUIZ.find((q) => q.t === answer)?.ok ? "success" : "warning"}>
              Agent B takes mostly outbound calls with much noisier audio. Within each quality tier, the agents perform about the same — transcript quality (an ASR problem) is the root cause, and Agent is a
              confounded proxy. The fix is upstream (ASR/normalization, or a better prompt for noisy calls — compare prompt v1 vs v2 on noisy slices), not agent retraining.
            </Callout>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
