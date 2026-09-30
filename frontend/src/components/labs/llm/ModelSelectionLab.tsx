"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, LabeledSlider, Textarea, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { cn, formatMoney, formatNumber, pct } from "@/lib/utils";

interface Model {
  id: string;
  name: string;
  arch: string;
  quality: number; // macro-F1 on the team's gold set (fictional)
  priceIn: number; // $/1M
  priceOut: number;
  fixedMonthly?: number;
  p50: number; // seconds
  p95: number;
  context: number;
  json: number; // valid JSON rate
  onPrem: boolean;
  throughput: string;
}

const MODELS: Model[] = [
  { id: "atlas-xl", name: "Atlas-XL", arch: "Dense · very large", quality: 0.92, priceIn: 15, priceOut: 60, p50: 2.8, p95: 5.5, context: 200_000, json: 0.995, onPrem: false, throughput: "moderate" },
  { id: "atlas-s", name: "Atlas-S", arch: "Dense · small", quality: 0.82, priceIn: 0.4, priceOut: 1.6, p50: 0.45, p95: 0.9, context: 128_000, json: 0.97, onPrem: false, throughput: "high" },
  { id: "hydra", name: "Hydra-MoE", arch: "Mixture-of-experts · 8 experts, 2 active", quality: 0.89, priceIn: 2.5, priceOut: 10, p50: 1.1, p95: 2.4, context: 128_000, json: 0.98, onPrem: false, throughput: "high" },
  { id: "local-8b", name: "Local-8B", arch: "Dense · 8B · self-hosted", quality: 0.76, priceIn: 0, priceOut: 0, fixedMonthly: 1800, p50: 0.6, p95: 1.4, context: 32_000, json: 0.9, onPrem: true, throughput: "limited by your GPUs" },
  { id: "longctx", name: "LongCtx-Pro", arch: "Dense · long-context", quality: 0.88, priceIn: 5, priceOut: 20, p50: 3.5, p95: 9.0, context: 1_000_000, json: 0.98, onPrem: false, throughput: "low" },
];

interface Workload {
  id: string;
  title: string;
  description: string;
  calls: number;
  inTok: number;
  outTok: number;
  maxP95?: number;
  minQuality?: number;
  onPremRequired?: boolean;
  objective: "cost" | "quality";
  acceptable: string[];
  reasoning: string;
}

const WORKLOADS: Workload[] = [
  {
    id: "assist",
    title: "Real-time agent assist",
    description: "Suggest the next best question to the agent while the customer is still talking. Suggestions arriving after ~1 second are useless.",
    calls: 5_000_000,
    inTok: 800,
    outTok: 60,
    maxP95: 1.0,
    objective: "quality",
    acceptable: ["atlas-s"],
    reasoning: "The p95 latency budget (1.0 s) is a hard constraint that eliminates every model except Atlas-S. Among feasible models you then maximize quality — there's only one. Local-8B's p95 (1.4 s) also fails, and its quality is lower.",
  },
  {
    id: "batch",
    title: "Nightly batch intent classification",
    description: "Classify every call from the previous day. Results are needed by 9 am. The business requires macro-F1 ≥ 0.85 on the gold set.",
    calls: 3_000_000,
    inTok: 2500,
    outTok: 80,
    minQuality: 0.85,
    objective: "cost",
    acceptable: ["hydra"],
    reasoning: "No latency constraint, a quality floor of 0.85 and a cost objective. Atlas-XL, Hydra-MoE and LongCtx-Pro meet the floor; Hydra-MoE is several times cheaper. Paying for Atlas-XL's extra 3 points is not what the objective asks for — unless the business says those points are worth the money.",
  },
  {
    id: "disputes",
    title: "Compliance dispute review",
    description: "300 disputed calls a month; each is long (~45k tokens incl. rulebook). Every error is costly; budget is not a concern.",
    calls: 300,
    inTok: 45_000,
    outTok: 800,
    objective: "quality",
    acceptable: ["atlas-xl"],
    reasoning: "Tiny volume, very high stakes: maximize quality among models whose context fits 45k tokens. Atlas-XL fits (200k) and has the best quality. Monthly cost is trivial at 300 calls.",
  },
  {
    id: "residency",
    title: "Regulated data-residency deployment",
    description: "A bank's regulator forbids sending transcripts to external APIs. 200k calls/month, quality floor 0.75.",
    calls: 200_000,
    inTok: 2000,
    outTok: 80,
    onPremRequired: true,
    minQuality: 0.75,
    objective: "quality",
    acceptable: ["local-8b"],
    reasoning: "Data residency is a hard constraint: only the self-hosted model is feasible. Then invest in closing the quality gap: constrained decoding for JSON validity, better prompts, fine-tuning on your labels.",
  },
];

function monthlyCost(m: Model, w: Workload) {
  if (m.fixedMonthly !== undefined) return m.fixedMonthly;
  return (w.calls * (w.inTok * m.priceIn + w.outTok * m.priceOut)) / 1e6;
}

function feasibility(m: Model, w: Workload) {
  const reasons: string[] = [];
  if (w.maxP95 !== undefined && m.p95 > w.maxP95) reasons.push(`p95 ${m.p95}s > ${w.maxP95}s budget`);
  if (w.minQuality !== undefined && m.quality < w.minQuality) reasons.push(`quality ${m.quality} < ${w.minQuality}`);
  if (m.context < w.inTok + w.outTok) reasons.push(`context ${formatNumber(m.context)} < ${formatNumber(w.inTok + w.outTok)} tokens`);
  if (w.onPremRequired && !m.onPrem) reasons.push("sends data to an external API");
  return reasons;
}

export default function ModelSelectionLab() {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [why, setWhy] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [batch, setBatch] = useState(8);

  const tp = useMemo(() => {
    const latency = 0.35 + 0.045 * batch; // seconds per request (simulated)
    return { latency, throughput: batch / latency };
  }, [batch]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Candidate models</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Fictional models with realistic trade-offs. Quality = macro-F1 on your team's gold set.</p>
          </div>
          <ModeBadge mode="precomputed" detail="Fictional model specs. Real prices and latencies change often — always benchmark on your data." />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Model</th>
                <th className="py-1 pr-3">Architecture</th>
                <th className="py-1 pr-3 text-right">Quality</th>
                <th className="py-1 pr-3 text-right">$ in / out per 1M</th>
                <th className="py-1 pr-3 text-right">Latency p50 / p95</th>
                <th className="py-1 pr-3 text-right">Context</th>
                <th className="py-1 pr-3 text-right">Valid JSON</th>
                <th className="py-1">Deployment</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="py-1.5 pr-3 font-medium">{m.name}</td>
                  <td className="py-1.5 pr-3 text-xs text-muted-foreground">{m.arch}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{m.quality.toFixed(2)}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{m.fixedMonthly !== undefined ? `$${m.fixedMonthly}/mo fixed` : `${m.priceIn} / ${m.priceOut}`}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{m.p50}s / {m.p95}s</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{formatNumber(m.context)}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{pct(m.json, 1)}</td>
                  <td className="py-1.5 text-xs">{m.onPrem ? "on-prem" : "external API"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {WORKLOADS.map((w) => {
        const pick = picks[w.id];
        const done = submitted[w.id];
        const correct = done && w.acceptable.includes(pick);
        return (
          <Card key={w.id}>
            <CardHeader>
              <CardTitle>{w.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{w.description}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant="muted">{formatNumber(w.calls)} calls/month</Badge>
                <Badge variant="muted">{formatNumber(w.inTok)} in / {w.outTok} out tokens</Badge>
                {w.maxP95 && <Badge variant="warning">p95 ≤ {w.maxP95}s</Badge>}
                {w.minQuality && <Badge variant="warning">quality ≥ {w.minQuality}</Badge>}
                {w.onPremRequired && <Badge variant="warning">data must stay on-prem</Badge>}
                <Badge variant="info">objective: {w.objective === "cost" ? "minimize cost" : "maximize quality"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    disabled={done}
                    onClick={() => setPicks((p) => ({ ...p, [w.id]: m.id }))}
                    className={cn("rounded-md border px-3 py-1.5 text-sm", !done && "cursor-pointer hover:bg-muted", pick === m.id && "border-primary bg-primary-soft text-primary")}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
              <Textarea rows={2} disabled={done} placeholder="Your reasoning (optional, but write it — it's the skill being trained)" value={why[w.id] ?? ""} onChange={(e) => setWhy((x) => ({ ...x, [w.id]: e.target.value }))} />
              <div className="flex gap-2">
                <Button onClick={() => setSubmitted((s) => ({ ...s, [w.id]: true }))} disabled={!pick || done}>
                  Submit choice
                </Button>
                {done && (
                  <Button variant="ghost" onClick={() => setSubmitted((s) => ({ ...s, [w.id]: false }))}>
                    Change
                  </Button>
                )}
              </div>
              {done && (
                <div className="space-y-3">
                  <div className={cn("flex items-center gap-2 rounded-md border p-2 text-sm font-medium", correct ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft")}>
                    {correct ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />}
                    {correct ? "Defensible choice." : `A stronger choice exists: ${w.acceptable.map((a) => MODELS.find((m) => m.id === a)!.name).join(" / ")}.`}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="py-1 pr-3">Model</th>
                          <th className="py-1 pr-3 text-right">Monthly cost</th>
                          <th className="py-1 pr-3 text-right">Quality</th>
                          <th className="py-1">Feasible?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODELS.map((m) => {
                          const f = feasibility(m, w);
                          return (
                            <tr key={m.id} className={cn("border-t", w.acceptable.includes(m.id) && "bg-success-soft")}>
                              <td className="py-1.5 pr-3 font-medium">
                                {m.name} {pick === m.id && <Badge variant="info">your pick</Badge>}
                              </td>
                              <td className="py-1.5 pr-3 text-right font-mono">{formatMoney(monthlyCost(m, w))}</td>
                              <td className="py-1.5 pr-3 text-right font-mono">{m.quality.toFixed(2)}</td>
                              <td className="py-1.5 text-xs">{f.length ? <span className="text-danger">✗ {f.join("; ")}</span> : <span className="text-success">✓ meets all constraints</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Callout tone="info" title="Reasoning">
                    {w.reasoning}
                  </Callout>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Latency vs throughput when batching requests on one server</CardTitle>
          <ModeBadge mode="simulated" detail="latency = 0.35 s + 0.045 s × batch size (toy linear model)" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[280px_1fr]">
          <LabeledSlider label="Server batch size" value={batch} onChange={setBatch} min={1} max={64} step={1} format={(v) => String(v)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Per-request latency</div>
              <div className="text-2xl font-semibold">{tp.latency.toFixed(2)} s</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Throughput</div>
              <div className="text-2xl font-semibold">{tp.throughput.toFixed(1)} req/s</div>
            </div>
            <p className="col-span-2 text-xs text-muted-foreground">
              Bigger batches amortize the model's weights over more requests (throughput ↑) but each request waits for the batch (latency ↑). Batch analytics wants big batches; real-time assist wants small ones.
              MoE models add a twist: only a few experts run per token (less compute), but all experts must sit in memory.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
