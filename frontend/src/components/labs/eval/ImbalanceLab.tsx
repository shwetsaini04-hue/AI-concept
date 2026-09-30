"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, LabeledSlider, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { ConfusionMatrix2 } from "@/components/shared/ConfusionMatrix";
import { binaryMetrics } from "@/lib/metrics/classification";
import { binomialSample, wilson } from "@/lib/metrics/stats";
import { cn, formatNumber, pct, rng } from "@/lib/utils";

const N = 10000;

export default function ImbalanceLab() {
  const [prev, setPrev] = useState(0.05);
  const [sens, setSens] = useState(0.9);
  const [spec, setSpec] = useState(0.95);
  const [sampleN, setSampleN] = useState(200);

  const counts = useMemo(() => {
    const tp = Math.round(N * prev * sens);
    const fn = Math.round(N * prev) - tp;
    const fp = Math.round(N * (1 - prev) * (1 - spec));
    const tn = N - tp - fn - fp;
    return { tp, fn, fp, tn };
  }, [prev, sens, spec]);
  const m = binaryMetrics(counts);
  const baseline = 1 - prev;

  const precisionCurve = useMemo(() => {
    const pts = [];
    for (const p of [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5]) {
      const prec = (sens * p) / (sens * p + (1 - spec) * (1 - p));
      pts.push({ prevalence: p * 100, precision: Number(prec.toFixed(3)) });
    }
    return pts;
  }, [sens, spec]);

  const sampling = useMemo(() => {
    const r = rng(5);
    const trials = 400;
    const counts: number[] = [];
    for (let t = 0; t < trials; t++) counts.push(binomialSample(sampleN, prev, r));
    const maxK = Math.max(...counts);
    const hist = Array.from({ length: Math.min(maxK + 1, 60) }, (_, k) => ({ k, trials: counts.filter((c) => c === k).length }));
    const meanPos = counts.reduce((a, b) => a + b, 0) / trials;
    const fewer5 = counts.filter((c) => c < 5).length / trials;
    const zero = counts.filter((c) => c === 0).length / trials;
    const typical = Math.round(sampleN * prev);
    const ciRandom = wilson(Math.round(typical * sens), Math.max(1, typical));
    const strat = Math.floor(sampleN / 2);
    const ciStrat = wilson(Math.round(strat * sens), strat);
    return { hist, meanPos, fewer5, zero, typical, ciRandom, strat, ciStrat };
  }, [sampleN, prev, sens]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Rare-event simulation (10,000 calls)</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">The same classifier (fixed sensitivity & specificity) evaluated on traffic with different positive rates.</p>
          </div>
          <ModeBadge mode="computed" detail="Expected confusion matrix = N × prevalence × rates (exact arithmetic)." />
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Positive rate</div>
              <div className="flex gap-1.5">
                {[0.01, 0.05, 0.2, 0.5].map((p) => (
                  <Button key={p} size="sm" variant={Math.abs(prev - p) < 1e-9 ? "default" : "outline"} onClick={() => setPrev(p)}>
                    {p * 100}%
                  </Button>
                ))}
              </div>
            </div>
            <LabeledSlider label="Positive rate (fine)" value={prev} onChange={setPrev} min={0.005} max={0.5} step={0.005} format={(v) => pct(v, 1)} />
            <LabeledSlider label="Classifier sensitivity (recall)" value={sens} onChange={setSens} min={0.5} max={0.99} step={0.01} format={(v) => v.toFixed(2)} />
            <LabeledSlider label="Classifier specificity" value={spec} onChange={setSpec} min={0.5} max={0.999} step={0.001} format={(v) => v.toFixed(3)} />
            <ConfusionMatrix2 counts={counts} />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <M label="Accuracy" v={m.accuracy} />
              <M label="Precision" v={m.precision} bad={m.precision < 0.5} />
              <M label="Recall" v={m.recall} />
              <M label="F1" v={m.f1} />
              <M label="'Always negative' accuracy" v={baseline} bad />
            </div>
            <Callout tone={m.precision < 0.5 ? "warning" : "info"}>
              At {pct(prev, 1)} prevalence: accuracy {pct(m.accuracy, 1)}, yet only <b>{pct(m.precision)}</b> of flagged calls are truly positive — {formatNumber(counts.fp)} false alarms vs {formatNumber(counts.tp)} true hits.
              A useless model that always says “negative” scores {pct(baseline, 1)} accuracy.
            </Callout>
            <div className="h-52">
              <div className="mb-1 text-xs text-muted-foreground">Precision of this same classifier as prevalence changes</div>
              <ResponsiveContainer>
                <LineChart data={precisionCurve} margin={{ left: -15, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="prevalence" type="number" scale="log" domain={[0.5, 50]} ticks={[0.5, 1, 2, 5, 10, 20, 50]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Line dataKey="precision" stroke="var(--primary)" strokeWidth={2} />
                  <ReferenceLine x={prev * 100} stroke="var(--danger)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Why stratify your evaluation sample</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">You can afford to label {sampleN} calls. How many positives will a random sample contain?</p>
          </div>
          <ModeBadge mode="simulated" detail="400 random samples drawn with a seeded RNG." />
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <LabeledSlider label="Labelling budget (calls)" value={sampleN} onChange={setSampleN} min={50} max={1000} step={50} format={(v) => String(v)} />
            <div className="space-y-1 text-sm">
              <Row k="Mean positives per random sample" v={sampling.meanPos.toFixed(1)} />
              <Row k="Samples with < 5 positives" v={pct(sampling.fewer5)} bad={sampling.fewer5 > 0.1} />
              <Row k="Samples with zero positives" v={pct(sampling.zero)} bad={sampling.zero > 0.01} />
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground">95% CI for recall (true recall {sens.toFixed(2)})</div>
              <div className="mt-1 flex items-center justify-between">
                <span>Random (~{sampling.typical} positives)</span>
                <Badge variant="danger">
                  {sampling.ciRandom[0].toFixed(2)} – {sampling.ciRandom[1].toFixed(2)}
                </Badge>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Stratified ({sampling.strat} positives)</span>
                <Badge variant="success">
                  {sampling.ciStrat[0].toFixed(2)} – {sampling.ciStrat[1].toFixed(2)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-52">
              <div className="mb-1 text-xs text-muted-foreground">Number of positives in each of 400 random samples</div>
              <ResponsiveContainer>
                <BarChart data={sampling.hist} margin={{ left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="k" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="trials" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Callout tone="info">
              <b>Stratified sampling</b>: sample positives and negatives (or languages, agents…) separately in chosen proportions, e.g. 50/50. Recall is then measured on enough positives to be meaningful. To report
              population-level precision or accuracy, re-weight each stratum by its true share of traffic.
            </Callout>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function M({ label, v, bad }: { label: string; v: number; bad?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-2.5", bad && "border-warning/40 bg-warning-soft")}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-mono text-lg font-semibold">{pct(v, 1)}</div>
    </div>
  );
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <div className="flex justify-between border-b py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("font-mono", bad && "text-danger")}>{v}</span>
    </div>
  );
}
