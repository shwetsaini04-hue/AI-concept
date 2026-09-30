"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, LabeledSlider, Tabs, TabsContent, TabsList, TabsTrigger, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { ConfusionMatrix2 } from "@/components/shared/ConfusionMatrix";
import { binaryMetrics, type BinaryCounts } from "@/lib/metrics/classification";
import { cn, formatNumber, gaussian, pct, rng } from "@/lib/utils";

export default function MetricsLab() {
  return (
    <Tabs defaultValue="matrix">
      <TabsList>
        <TabsTrigger value="matrix">Confusion-matrix playground</TabsTrigger>
        <TabsTrigger value="threshold">Threshold & business cost</TabsTrigger>
      </TabsList>
      <TabsContent value="matrix">
        <MatrixTab />
      </TabsContent>
      <TabsContent value="threshold">
        <ThresholdTab />
      </TabsContent>
    </Tabs>
  );
}

function MatrixTab() {
  const [c, setC] = useState<BinaryCounts>({ tp: 40, fp: 10, tn: 930, fn: 20 });
  const [beta, setBeta] = useState(1);
  const m = binaryMetrics(c);
  const set = (k: keyof BinaryCounts) => (v: number) => setC((x) => ({ ...x, [k]: Math.max(0, Math.round(v)) }));

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Detecting genuinely interested customers</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Positive class = “interested”. Edit the four counts and watch every metric update.</p>
        </div>
        <ModeBadge mode="computed" />
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <ConfusionMatrix2 counts={c} onChange={setC} />
          <div className="grid grid-cols-2 gap-3">
            {(["tp", "fp", "fn", "tn"] as const).map((k) => (
              <LabeledSlider key={k} label={k.toUpperCase()} value={c[k]} onChange={set(k)} min={0} max={k === "tn" ? 2000 : 200} step={1} format={(v) => String(Math.round(v))} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard name="Precision" formula="TP / (TP + FP)" v={m.precision} desc="Of customers we flagged, how many were really interested?" />
            <MetricCard name="Recall" formula="TP / (TP + FN)" v={m.recall} desc="Of really interested customers, how many did we find?" />
            <MetricCard name="F1" formula="2PR / (P + R)" v={m.f1} desc="Harmonic mean — punishes imbalance between P and R." />
            <MetricCard name="Accuracy" formula="(TP + TN) / N" v={m.accuracy} desc="Dominated by the big TN cell under imbalance." />
            <MetricCard name="Specificity" formula="TN / (TN + FP)" v={m.specificity} desc="Of uninterested customers, how many did we leave alone?" />
            <MetricCard name={`F-β (β=${beta.toFixed(1)})`} formula="(1+β²)PR / (β²P + R)" v={m.fbeta(beta)} desc="β > 1 weights recall more; β < 1 weights precision." />
          </div>
          <LabeledSlider label="β for F-beta" value={beta} onChange={setBeta} min={0.25} max={4} step={0.25} format={(v) => v.toFixed(2)} />
          <Callout tone="info" title="Read it like a business person">
            <b>{c.fp}</b> false positives = sales calls wasted on people who didn't want the loan. <b>{c.fn}</b> false negatives = genuinely interested customers nobody called back.
            Accuracy is {pct(m.accuracy, 1)} — mostly because of {formatNumber(c.tn)} easy true negatives. Which error is more expensive decides which metric you optimize.
          </Callout>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ name, formula, v, desc }: { name: string; formula: string; v: number; desc: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{name}</span>
        <span className="font-mono text-lg">{v.toFixed(3)}</span>
      </div>
      <div className="font-mono text-[10px] text-muted-foreground">{formula}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{desc}</div>
    </div>
  );
}

function ThresholdTab() {
  const [threshold, setThreshold] = useState(0.5);
  const [costFp, setCostFp] = useState(150);
  const [costFn, setCostFn] = useState(2500);
  const [prevalence, setPrevalence] = useState(0.2);

  const scores = useMemo(() => {
    const r = rng(11);
    const N = 2000;
    return Array.from({ length: N }, () => {
      const pos = r() < prevalence;
      const s = Math.min(1, Math.max(0, (pos ? 0.64 : 0.38) + gaussian(r) * 0.14));
      return { pos, s };
    });
  }, [prevalence]);

  const at = (t: number) => {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (const x of scores) {
      const p = x.s >= t;
      if (p && x.pos) tp++;
      else if (p) fp++;
      else if (x.pos) fn++;
      else tn++;
    }
    return { tp, fp, tn, fn };
  };

  const curve = useMemo(() => {
    const pts = [];
    for (let t = 0.05; t <= 0.951; t += 0.01) {
      const c = at(t);
      const m = binaryMetrics(c);
      pts.push({ t: Number(t.toFixed(2)), precision: m.precision, recall: m.recall, cost: c.fp * costFp + c.fn * costFn });
    }
    return pts;
  }, [scores, costFp, costFn]); // eslint-disable-line react-hooks/exhaustive-deps

  const hist = useMemo(() => {
    const bins = Array.from({ length: 20 }, (_, i) => ({ s: Number((i / 20 + 0.025).toFixed(3)), interested: 0, notInterested: 0 }));
    for (const x of scores) {
      const i = Math.min(19, Math.floor(x.s * 20));
      if (x.pos) bins[i].interested++;
      else bins[i].notInterested++;
    }
    return bins;
  }, [scores]);

  const c = at(threshold);
  const m = binaryMetrics(c);
  const best = curve.reduce((a, b) => (b.cost < a.cost ? b : a), curve[0]);
  const cost = c.fp * costFp + c.fn * costFn;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Choose a threshold using business costs</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">A classifier outputs a score per call. Where you cut decides the precision/recall trade-off — and the money.</p>
        </div>
        <ModeBadge mode="simulated" detail="2,000 synthetic scores from two overlapping normal distributions (seeded)." />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-4">
          <LabeledSlider label="Decision threshold" value={threshold} onChange={setThreshold} min={0.05} max={0.95} step={0.01} format={(v) => v.toFixed(2)} />
          <LabeledSlider label="Prevalence of interested" value={prevalence} onChange={setPrevalence} min={0.02} max={0.6} step={0.01} format={(v) => pct(v)} />
          <div className="space-y-1">
            <Label>Cost of a false positive (wasted call, ₹)</Label>
            <Input type="number" value={costFp} onChange={(e) => setCostFp(Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label>Cost of a false negative (lost customer, ₹)</Label>
            <Input type="number" value={costFn} onChange={(e) => setCostFn(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-56">
            <div className="mb-1 text-xs text-muted-foreground">Score distributions (the overlap is where errors live)</div>
            <ResponsiveContainer>
              <AreaChart data={hist} margin={{ left: -15, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="s" type="number" domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="step" dataKey="notInterested" name="not interested" stroke="var(--muted-foreground)" fill="var(--muted-foreground)" fillOpacity={0.25} />
                <Area type="step" dataKey="interested" name="interested" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
                <ReferenceLine x={threshold} stroke="var(--danger)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="h-56">
            <div className="mb-1 text-xs text-muted-foreground">Precision & recall vs threshold</div>
            <ResponsiveContainer>
              <LineChart data={curve} margin={{ left: -15, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="t" type="number" domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => Number(v).toFixed(2)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="precision" stroke="var(--primary)" dot={false} strokeWidth={2} />
                <Line dataKey="recall" stroke="var(--warning)" dot={false} strokeWidth={2} />
                <ReferenceLine x={Number(threshold.toFixed(2))} stroke="var(--danger)" />
                <ReferenceLine x={best.t} stroke="var(--success)" strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          <Box k="TP" v={c.tp} />
          <Box k="FP" v={c.fp} tone="danger" />
          <Box k="FN" v={c.fn} tone="warning" />
          <Box k="Precision / Recall" v={`${m.precision.toFixed(2)} / ${m.recall.toFixed(2)}`} />
          <Box k="Business cost" v={`₹${formatNumber(cost)}`} tone={cost <= best.cost * 1.05 ? "success" : undefined} />
        </div>
        <Callout tone={Math.abs(threshold - best.t) < 0.03 ? "success" : "info"}>
          Cost-minimizing threshold for these costs: <b>{best.t.toFixed(2)}</b> (total ₹{formatNumber(best.cost)}). When a missed customer costs {Math.round(costFn / Math.max(1, costFp))}× a wasted call, the optimum shifts toward
          <b> {costFn > costFp ? "higher recall (lower threshold)" : "higher precision (higher threshold)"}</b>. The “best metric” is a business decision, not a statistics decision.
        </Callout>
      </CardContent>
    </Card>
  );
}

function Box({ k, v, tone }: { k: string; v: string | number; tone?: "danger" | "warning" | "success" }) {
  return (
    <div className={cn("rounded-lg border p-2.5", tone === "danger" && "bg-danger-soft", tone === "warning" && "bg-warning-soft", tone === "success" && "bg-success-soft")}>
      <div className="text-[11px] text-muted-foreground">{k}</div>
      <div className="font-mono text-lg font-semibold">{v}</div>
    </div>
  );
}
