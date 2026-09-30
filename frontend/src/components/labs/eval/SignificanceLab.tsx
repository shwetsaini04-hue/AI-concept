"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Dices } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, LabeledSlider, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { binomialSample, mcnemar, sampleSizeTwoProportions, twoProportionTest, wilson } from "@/lib/metrics/stats";
import { cn, formatNumber, pct, rng } from "@/lib/utils";

export default function SignificanceLab() {
  const [n, setN] = useState(200);
  const [accA, setAccA] = useState(0.8);
  const [accB, setAccB] = useState(0.84);
  const [b, setB] = useState(9);
  const [c, setC] = useState(17);
  const [trueAcc, setTrueAcc] = useState(0.8);
  const [simN, setSimN] = useState(100);
  const [seed, setSeed] = useState(1);

  const xA = Math.round(accA * n);
  const xB = Math.round(accB * n);
  const t = twoProportionTest(xA, n, xB, n);
  const ciA = wilson(xA, n);
  const ciB = wilson(xB, n);
  const need = sampleSizeTwoProportions(accA, accB);
  const sig = t.pValue < 0.05;
  const mc = mcnemar(b, c);

  const sim = useMemo(() => {
    const r = rng(seed * 31);
    const diffs: number[] = [];
    for (let i = 0; i < 1000; i++) diffs.push((binomialSample(simN, trueAcc, r) - binomialSample(simN, trueAcc, r)) / simN);
    const bins: Record<string, number> = {};
    for (const d of diffs) {
      const k = (Math.round(d * 100 / 2) * 2).toFixed(0);
      bins[k] = (bins[k] ?? 0) + 1;
    }
    const hist = Object.entries(bins)
      .map(([k, v]) => ({ d: Number(k), count: v }))
      .sort((x, y) => x.d - y.d);
    const beats3 = diffs.filter((d) => d >= 0.03).length / diffs.length;
    const beats5 = diffs.filter((d) => d >= 0.05).length / diffs.length;
    return { hist, beats3, beats5 };
  }, [seed, simN, trueAcc]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>A/B prompt evaluation (independent samples)</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Prompt A and Prompt B are each evaluated on n labelled calls.</p>
          </div>
          <ModeBadge mode="computed" detail="Wilson intervals, two-proportion z-test, and a power-based sample-size formula." />
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="space-y-4">
            <LabeledSlider label="Sample size per prompt (n)" value={n} onChange={setN} min={20} max={3000} step={10} format={(v) => formatNumber(v)} />
            <LabeledSlider label="Observed accuracy — Prompt A" value={accA} onChange={setAccA} min={0.5} max={0.99} step={0.005} format={(v) => pct(v, 1)} />
            <LabeledSlider label="Observed accuracy — Prompt B" value={accB} onChange={setAccB} min={0.5} max={0.99} step={0.005} format={(v) => pct(v, 1)} />
          </div>
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-4">
              <CIBar label="Prompt A" p={xA / n} ci={ciA} color="var(--muted-foreground)" />
              <CIBar label="Prompt B" p={xB / n} ci={ciB} color="var(--primary)" />
              <p className="text-[11px] text-muted-foreground">Bars show 95% Wilson confidence intervals on a 50–100% axis.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Box k="Difference (B − A)" v={`${(t.diff * 100).toFixed(1)} pts`} />
              <Box k="95% CI of difference" v={`[${(t.ci[0] * 100).toFixed(1)}, ${(t.ci[1] * 100).toFixed(1)}]`} />
              <Box k="p-value (two-sided)" v={t.pValue < 0.001 ? "< 0.001" : t.pValue.toFixed(3)} tone={sig ? "success" : "warning"} />
              <Box k="n per prompt for 80% power" v={Number.isFinite(need) ? formatNumber(need) : "∞"} />
            </div>
            <Callout tone={sig ? "success" : "warning"}>
              {sig
                ? `Significant at α = 0.05: a gap this large would rarely appear by chance if the prompts were truly equal. Still ask whether ${(t.diff * 100).toFixed(1)} points matters to the business.`
                : `Not significant: a ${(t.diff * 100).toFixed(1)}-point gap on ${n} examples is well within sampling noise. You'd need ≈${Number.isFinite(need) ? formatNumber(need) : "∞"} examples per prompt to reliably detect a gap of this size.`}
            </Callout>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Paired comparison: both prompts on the same calls (McNemar)</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Only calls where the prompts disagree carry information about which is better.</p>
          </div>
          <ModeBadge mode="computed" />
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>b: A right, B wrong</Label>
              <Input type="number" min={0} value={b} onChange={(e) => setB(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div className="space-y-1">
              <Label>c: A wrong, B right</Label>
              <Input type="number" min={0} value={c} onChange={(e) => setC(Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Box k="Discordant pairs" v={String(b + c)} />
              <Box k="χ² (continuity-corrected)" v={mc.chi2.toFixed(2)} />
              <Box k="Exact p-value" v={mc.pExact < 0.001 ? "< 0.001" : mc.pExact.toFixed(3)} tone={mc.pExact < 0.05 ? "success" : "warning"} />
            </div>
            <p className="text-sm text-muted-foreground">
              Under “no difference”, disagreements should split 50/50 between b and c. McNemar asks how surprising a {b}/{c} split is. Pairing removes the noise from “some calls are just harder”, so it
              detects real differences with far fewer labelled calls than comparing two independent accuracies.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Two identical prompts, 1,000 evaluations</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Both prompts have the SAME true accuracy. Each is evaluated on its own random sample. How often does B look better?</p>
          </div>
          <ModeBadge mode="simulated" detail="Binomial sampling with a seeded RNG." />
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="space-y-4">
            <LabeledSlider label="True accuracy (both prompts)" value={trueAcc} onChange={setTrueAcc} min={0.6} max={0.95} step={0.01} format={(v) => pct(v)} />
            <LabeledSlider label="Eval sample size per prompt" value={simN} onChange={setSimN} min={20} max={2000} step={10} format={(v) => formatNumber(v)} />
            <Button variant="outline" size="sm" onClick={() => setSeed((s) => s + 1)}>
              <Dices /> Re-run simulation
            </Button>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">B “wins” by ≥ 3 pts</span><Badge variant={sim.beats3 > 0.1 ? "danger" : "muted"}>{pct(sim.beats3)}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">B “wins” by ≥ 5 pts</span><Badge variant={sim.beats5 > 0.05 ? "danger" : "muted"}>{pct(sim.beats5)}</Badge></div>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={sim.hist} margin={{ left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="d" tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} label={{ value: "observed B − A (points)", position: "insideBottom", offset: -2, fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine x={0} stroke="var(--foreground)" />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {sim.hist.map((h, i) => (
                    <Cell key={i} fill={h.d >= 3 ? "var(--danger)" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CIBar({ label, p, ci, color }: { label: string; p: number; ci: [number, number]; color: string }) {
  const x = (v: number) => `${Math.max(0, Math.min(100, ((v - 0.5) / 0.5) * 100))}%`;
  return (
    <div className="grid grid-cols-[80px_1fr_130px] items-center gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <div className="relative h-5 rounded bg-muted">
        <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded" style={{ left: x(ci[0]), width: `calc(${x(ci[1])} - ${x(ci[0])})`, background: color, opacity: 0.5 }} />
        <div className="absolute top-0 h-5 w-1 -translate-x-1/2 rounded" style={{ left: x(p), background: color }} />
      </div>
      <span className="font-mono text-xs">
        {pct(p, 1)} [{pct(ci[0], 1)}, {pct(ci[1], 1)}]
      </span>
    </div>
  );
}

function Box({ k, v, tone }: { k: string; v: string; tone?: "success" | "warning" }) {
  return (
    <div className={cn("rounded-lg border p-2.5", tone === "success" && "bg-success-soft", tone === "warning" && "bg-warning-soft")}>
      <div className="text-[11px] text-muted-foreground">{k}</div>
      <div className="font-mono text-base font-semibold">{v}</div>
    </div>
  );
}
