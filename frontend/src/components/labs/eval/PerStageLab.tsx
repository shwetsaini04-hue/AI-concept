"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Check, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, LabeledSlider, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { cn, pct, rng } from "@/lib/utils";

const STAGES = ["Speaker attribution", "NER", "Classification", "Evidence extraction", "Verification"] as const;

const SCENARIOS: Record<string, number[]> = {
  "Mystery A": [0.82, 0.95, 0.94, 0.95, 0.97],
  "Mystery B": [0.97, 0.8, 0.93, 0.95, 0.97],
  "Mystery C": [0.97, 0.95, 0.95, 0.78, 0.97],
};

/** Given wrong input, a stage produces a wrong output with this probability. */
const PROPAGATE = 0.75;

function run(acc: number[], perfect: number | null, seed = 3) {
  const r = rng(seed);
  const N = 400;
  const traces: boolean[][] = [];
  for (let k = 0; k < N; k++) {
    const ok: boolean[] = [];
    let upstreamOk = true;
    for (let s = 0; s < acc.length; s++) {
      let correct: boolean;
      if (s === perfect) correct = upstreamOk ? true : r() > PROPAGATE;
      else if (upstreamOk) correct = r() < acc[s];
      else correct = r() > PROPAGATE; // may accidentally recover
      ok.push(correct);
      upstreamOk = correct;
    }
    traces.push(ok);
  }
  const e2e = traces.filter((t) => t[t.length - 1]).length / N;
  const origin = acc.map((_, s) => traces.filter((t) => t.indexOf(false) === s).length);
  const measured = acc.map((_, s) => traces.filter((t) => t[s]).length / N);
  return { e2e, origin, measured, traces };
}

export default function PerStageLab() {
  const [acc, setAcc] = useState<number[]>(SCENARIOS["Mystery A"]);
  const [scenario, setScenario] = useState("Mystery A");
  const [guess, setGuess] = useState<number | null>(null);

  const base = useMemo(() => run(acc, null), [acc]);
  const oracle = useMemo(() => acc.map((_, s) => run(acc, s).e2e), [acc]);
  const bestFix = oracle.indexOf(Math.max(...oracle));
  const failed = base.traces.filter((t) => !t[t.length - 1]).slice(0, 8);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>End-to-end dashboard: where did the system fail?</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">400 transcripts flow through 5 stages. A wrong input makes a stage's output wrong {Math.round(PROPAGATE * 100)}% of the time.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ModeBadge mode="simulated" detail="Seeded Monte-Carlo over the per-stage accuracies below." />
            {Object.keys(SCENARIOS).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={scenario === k ? "default" : "outline"}
                onClick={() => {
                  setScenario(k);
                  setAcc(SCENARIOS[k]);
                  setGuess(null);
                }}
              >
                {k}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-primary-soft p-4 text-center">
            <div className="text-xs text-muted-foreground">End-to-end accuracy (the only number most dashboards show)</div>
            <div className="text-4xl font-semibold text-primary">{pct(base.e2e, 1)}</div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-2 font-medium">Which stage should you fix first?</div>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setGuess(i)}
                  className={cn(
                    "cursor-pointer rounded-md border px-3 py-1.5 text-sm",
                    guess === i && (i === bestFix ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger"),
                    guess !== null && guess !== i && i === bestFix && "border-success text-success",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            {guess === null ? (
              <p className="mt-2 text-xs text-muted-foreground">Make your guess from the end-to-end number alone… then look at the per-stage view below. (You can't — that's the point.)</p>
            ) : (
              <p className="mt-2 text-sm">
                {guess === bestFix ? "Correct" : "Not the best choice"} — making <b>{STAGES[bestFix]}</b> perfect lifts end-to-end accuracy from {pct(base.e2e, 1)} to {pct(oracle[bestFix], 1)}, the largest gain of any stage.
              </p>
            )}
          </div>

          {guess !== null && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-semibold">Per-stage metrics</div>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1">Stage</th>
                      <th className="py-1 text-right">Isolated accuracy (gold input)</th>
                      <th className="py-1 text-right">In-pipeline</th>
                      <th className="py-1 text-right">If this stage were perfect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STAGES.map((s, i) => (
                      <tr key={s} className={cn("border-t", i === bestFix && "bg-success-soft")}>
                        <td className="py-1.5">{s}</td>
                        <td className="py-1.5 text-right font-mono">{pct(acc[i], 0)}</td>
                        <td className="py-1.5 text-right font-mono">{pct(base.measured[i], 0)}</td>
                        <td className="py-1.5 text-right font-mono">{pct(oracle[i], 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted-foreground">
                  “Isolated” = the stage evaluated on gold inputs (its own quality). “In-pipeline” = the fraction of correct outputs after upstream errors propagate. The last column is an <i>oracle ablation</i>.
                </p>
              </div>
              <div className="h-64">
                <div className="mb-1 text-sm font-semibold">Where end-to-end errors originate (first failing stage)</div>
                <ResponsiveContainer>
                  <BarChart data={STAGES.map((s, i) => ({ s: s.split(" ")[0], errors: base.origin[i] }))} margin={{ left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="s" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="errors" radius={[4, 4, 0, 0]}>
                      {STAGES.map((_, i) => (
                        <Cell key={i} fill={i === bestFix ? "var(--danger)" : "var(--muted-foreground)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {guess !== null && (
            <div>
              <div className="mb-2 text-sm font-semibold">Traces of failed transcripts</div>
              <div className="space-y-1">
                {failed.map((t, k) => (
                  <div key={k} className="flex flex-wrap items-center gap-1 text-xs">
                    <span className="w-14 font-mono text-muted-foreground">#{k + 1}</span>
                    {t.map((ok, s) => (
                      <span key={s} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5", ok ? "bg-success-soft text-success" : s === t.indexOf(false) ? "bg-danger text-white" : "bg-danger-soft text-danger")}>
                        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {STAGES[s].split(" ")[0]}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">The solid red chip is where each failure started; lighter red chips are downstream consequences.</p>
            </div>
          )}

          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((s, i) => (
              <LabeledSlider
                key={s}
                label={`${s} (isolated acc.)`}
                value={acc[i]}
                onChange={(v) => {
                  setAcc(acc.map((x, j) => (j === i ? v : x)));
                  setScenario("custom");
                }}
                min={0.6}
                max={1}
                step={0.01}
                format={(v) => pct(v)}
              />
            ))}
          </div>
          <Callout tone="info">
            End-to-end accuracy tells you <i>that</i> the system fails, never <i>where</i>. Label a small gold set for every stage's output (speakers, entities, labels, evidence) so you can compute isolated metrics,
            in-pipeline metrics and oracle ablations. <Badge variant="muted">Tip</Badge> Scenarios A, B and C have similar end-to-end numbers but different root causes.
          </Callout>
        </CardContent>
      </Card>
    </div>
  );
}
