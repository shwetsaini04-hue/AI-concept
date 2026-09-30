"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, Bar } from "recharts";
import { Wand2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, LabeledSlider, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { brier, ece, fitTemperature, logit, nll, reliabilityBins, scaleConfidence, sigmoid, type Prediction } from "@/lib/metrics/calibration";
import { pct, rng } from "@/lib/utils";

type Mode = "calibrated" | "overconfident" | "underconfident";

function makeData(mode: Mode, seed: number): Prediction[] {
  const r = rng(seed);
  const out: Prediction[] = [];
  for (let i = 0; i < 1200; i++) {
    const q = 0.5 + 0.49 * Math.pow(r(), 0.7); // true P(correct)
    const correct = r() < q;
    const k = mode === "calibrated" ? 1 : mode === "overconfident" ? 2.4 : 0.45;
    out.push({ confidence: sigmoid(logit(q) * k), correct });
  }
  return out;
}

export default function CalibrationLab() {
  const [mode, setMode] = useState<Mode>("overconfident");
  const [T, setT] = useState(1);
  const data = useMemo(() => makeData(mode, 17), [mode]);
  const val = data.slice(0, 600);
  const test = data.slice(600);
  const scaled = useMemo(() => test.map((p) => ({ ...p, confidence: scaleConfidence(p.confidence, T) })), [test, T]);
  const bins = useMemo(() => reliabilityBins(scaled, 10), [scaled]);
  const chart = bins.map((b) => ({
    mid: (b.lo + b.hi) / 2,
    perfect: (b.lo + b.hi) / 2,
    conf: b.count ? Number(b.avgConfidence.toFixed(3)) : null,
    acc: b.count ? Number(b.accuracy.toFixed(3)) : null,
    count: b.count,
  }));
  // Scatter points use the XAxis dataKey ("mid") for x — here that's the bin's average confidence.
  const pts = bins.filter((b) => b.count).map((b) => ({ mid: Number(b.avgConfidence.toFixed(3)), acc: Number(b.accuracy.toFixed(3)) }));
  const e = ece(scaled);
  const bs = brier(scaled);
  const n = nll(scaled);
  const high = scaled.filter((p) => p.confidence >= 0.85 && p.confidence < 0.95);
  const highAcc = high.length ? high.filter((p) => p.correct).length / high.length : 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Reliability diagram</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Predictions are grouped by confidence. In each bin, compare average confidence with the fraction actually correct.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ModeBadge mode="simulated" detail="1,200 synthetic predictions; half used to fit T (validation), half to evaluate (test)." />
            {(["calibrated", "overconfident", "underconfident"] as Mode[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={mode === m ? "default" : "outline"}
                onClick={() => {
                  setMode(m);
                  setT(1);
                }}
              >
                {m}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="h-80">
            <ResponsiveContainer>
              <ComposedChart data={chart} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mid" type="number" domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} label={{ value: "confidence", position: "insideBottom", offset: -2, fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis yAxisId="a" domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis yAxisId="c" orientation="right" hide />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="c" dataKey="count" name="# predictions" fill="var(--muted-foreground)" fillOpacity={0.15} barSize={24} />
                <Line yAxisId="a" dataKey="perfect" name="perfect calibration" stroke="var(--muted-foreground)" strokeDasharray="5 5" dot={false} />
                <Scatter yAxisId="a" data={pts} dataKey="acc" name="observed accuracy" fill="var(--primary)" line={{ stroke: "var(--primary)", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            <LabeledSlider label="Temperature scaling T" value={T} onChange={setT} min={0.3} max={3} step={0.02} format={(v) => v.toFixed(2)} hint="p' = σ(logit(p) / T). T > 1 softens overconfidence." />
            <Button variant="outline" size="sm" onClick={() => setT(Number(fitTemperature(val).T.toFixed(2)))}>
              <Wand2 /> Fit T on validation half
            </Button>
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">ECE</span><span className="font-mono">{e.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Brier score</span><span className="font-mono">{bs.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">NLL</span><span className="font-mono">{n.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Accuracy (unchanged by T)</span><span className="font-mono">{pct(test.filter((p) => p.correct).length / test.length, 1)}</span></div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground">When the model says ≈0.90 (0.85–0.95):</div>
              <div className="mt-1">
                {high.length} predictions, <b>{high.filter((p) => p.correct).length}</b> correct → <Badge variant={Math.abs(highAcc - 0.9) < 0.05 ? "success" : "warning"}>{pct(highAcc)} actual</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Callout tone="info" title="Why this matters for transcript systems">
        If you auto-approve outputs with confidence ≥ 0.9 and send the rest to human review, you are assuming ≥ 0.9 means ≤ 10% errors. An overconfident model silently floods production with errors.
        LLMs' self-reported (“verbalized”) confidence is often poorly calibrated; prefer measured signals (token log-probabilities where available, agreement across samples) — and always check the reliability diagram on labelled data.
      </Callout>
    </div>
  );
}
