"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, AlertTriangle, CheckCircle2, Loader2, Play } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, LabeledSlider, Select, Switch, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { ProviderPicker } from "@/components/shared/ProviderPicker";
import { BackendProvider } from "@/lib/llm";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

interface Block {
  id: string;
  name: string;
  tokens: number;
  relevant: boolean;
  static: boolean;
  role: "instructions" | "knowledge" | "examples" | "input" | "query" | "noise";
  color: string;
}

const BLOCKS: Block[] = [
  { id: "system", name: "SYSTEM PROMPT", tokens: 180, relevant: true, static: true, role: "instructions", color: "bg-violet-500" },
  { id: "rulebook", name: "RULEBOOK (labelling rules)", tokens: 2400, relevant: true, static: true, role: "knowledge", color: "bg-sky-500" },
  { id: "examples", name: "EXAMPLES (4 few-shot)", tokens: 900, relevant: true, static: true, role: "examples", color: "bg-emerald-500" },
  { id: "conversation", name: "CONVERSATION (this call)", tokens: 1300, relevant: true, static: false, role: "input", color: "bg-amber-500" },
  { id: "evidence", name: "EVIDENCE (pre-extracted spans)", tokens: 180, relevant: true, static: false, role: "input", color: "bg-orange-500" },
  { id: "query", name: "USER QUERY (task + output format)", tokens: 90, relevant: true, static: true, role: "query", color: "bg-rose-500" },
  { id: "history", name: "Old call history (3 prior calls)", tokens: 3600, relevant: false, static: false, role: "noise", color: "bg-zinc-400" },
  { id: "catalogue", name: "Full product catalogue", tokens: 6200, relevant: false, static: true, role: "noise", color: "bg-zinc-500" },
  { id: "rulebook-v1", name: "Duplicate rulebook (old v1)", tokens: 2300, relevant: false, static: true, role: "noise", color: "bg-zinc-400" },
  { id: "handbook", name: "HR policy handbook", tokens: 9100, relevant: false, static: true, role: "noise", color: "bg-zinc-500" },
];

const WINDOWS = [8000, 32000, 128000, 200000];

export default function ContextLab() {
  const [order, setOrder] = useState<string[]>(BLOCKS.map((b) => b.id));
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(BLOCKS.map((b) => [b.id, b.role !== "noise"])));
  const [windowSize, setWindowSize] = useState(32000);
  const [price, setPrice] = useState(3);

  const active = order.map((id) => BLOCKS.find((b) => b.id === id)!).filter((b) => enabled[b.id]);
  const total = active.reduce((a, b) => a + b.tokens, 0);
  const irrelevant = active.filter((b) => !b.relevant).reduce((a, b) => a + b.tokens, 0);
  let cachedPrefix = 0;
  for (const b of active) {
    if (!b.static) break;
    cachedPrefix += b.tokens;
  }
  const convIdx = active.findIndex((b) => b.id === "conversation");
  const convStart = active.slice(0, Math.max(0, convIdx)).reduce((a, b) => a + b.tokens, 0);
  const convMidFrac = convIdx >= 0 && total ? (convStart + active[convIdx].tokens / 2) / total : 0;
  const queryIdx = active.findIndex((b) => b.id === "query");

  const warnings: { level: "error" | "warning" | "ok"; text: string }[] = [];
  if (total > windowSize) warnings.push({ level: "error", text: `Context overflow: ${formatNumber(total)} tokens > ${formatNumber(windowSize)} window. The request fails or gets truncated.` });
  if (irrelevant / Math.max(1, total) > 0.4) warnings.push({ level: "warning", text: `Prompt bloat: ${Math.round((100 * irrelevant) / total)}% of tokens are irrelevant to this task. You pay for them on every call and they can distract the model (context rot).` });
  if (convIdx >= 0 && total > 8000 && convMidFrac > 0.25 && convMidFrac < 0.75)
    warnings.push({ level: "warning", text: "The conversation (your evidence) sits in the middle of a long context — the position most prone to being under-used ('lost in the middle'). Measure on your model, or move it." });
  if (queryIdx >= 0 && queryIdx < active.length - 1 && active.slice(queryIdx + 1).some((b) => b.role === "input"))
    warnings.push({ level: "warning", text: "The task/query comes before the transcript. Many practitioners put the question after long inputs so it's 'fresh' at generation time — test both orders." });
  const firstDynamic = active.findIndex((b) => !b.static);
  if (firstDynamic >= 0 && active.slice(firstDynamic).some((b) => b.static && b.tokens > 500))
    warnings.push({ level: "warning", text: "Dynamic content appears before large static blocks, so those static blocks can't be part of the cached prefix. Put stable content first." });
  if (!active.some((b) => b.id === "rulebook")) warnings.push({ level: "warning", text: "No rulebook: label definitions now live only in the model's priors. Expect inconsistent boundaries." });
  if (!warnings.length) warnings.push({ level: "ok", text: "Lean, relevant, well-ordered context with a cacheable static prefix." });

  const move = (id: string, dir: -1 | 1) =>
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const n = [...o];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Context-window simulator</CardTitle>
          <ModeBadge mode="computed" detail="Token counts are approximate block sizes; cost and position maths are exact for those sizes." />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Context window</Label>
              <Select value={windowSize} onChange={(e) => setWindowSize(Number(e.target.value))}>
                {WINDOWS.map((w) => (
                  <option key={w} value={w}>
                    {formatNumber(w)} tokens
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-40 space-y-1">
              <Label>Input $ / 1M tokens (example)</Label>
              <Input type="number" value={price} step={0.1} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted">{formatNumber(total)} tokens</Badge>
              <Badge variant="muted">{formatMoney((total * price) / 1e6)} per call</Badge>
              <Badge variant="muted">{formatMoney((total * price * 100000) / 1e6)} per 100k calls</Badge>
              <Badge variant={cachedPrefix > 1000 ? "success" : "muted"}>cacheable prefix: {formatNumber(cachedPrefix)} tokens</Badge>
            </div>
          </div>

          {/* Usage bar */}
          <div>
            <div className="relative flex h-8 w-full overflow-hidden rounded-md border bg-muted">
              {active.map((b) => (
                <div
                  key={b.id}
                  className={cn("h-full border-r border-white/40 transition-all", b.color, !b.relevant && "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,.35)_4px,rgba(255,255,255,.35)_8px)]")}
                  style={{ width: `${Math.min(100, (b.tokens / Math.max(windowSize, total)) * 100)}%` }}
                  title={`${b.name}: ${b.tokens} tokens`}
                />
              ))}
              {total > windowSize && <div className="absolute inset-y-0 border-l-2 border-danger" style={{ left: `${(windowSize / total) * 100}%` }} />}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>start of context</span>
              <span>{Math.round((100 * total) / windowSize)}% of window used</span>
              <span>end (generation starts here)</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-1.5">
              {order.map((id, i) => {
                const b = BLOCKS.find((x) => x.id === id)!;
                return (
                  <div key={id} className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm", !enabled[id] && "opacity-50")}>
                    <span className={cn("h-3 w-3 shrink-0 rounded-sm", b.color)} />
                    <Switch checked={enabled[id]} onChange={(v) => setEnabled((e) => ({ ...e, [id]: v }))} />
                    <span className="flex-1 truncate font-mono text-xs">{b.name}</span>
                    <Badge variant={b.relevant ? "success" : "danger"} className="hidden sm:inline-flex">
                      {b.relevant ? "relevant" : "irrelevant"}
                    </Badge>
                    <Badge variant="muted" className="hidden sm:inline-flex">{b.static ? "static" : "per-call"}</Badge>
                    <span className="w-14 text-right font-mono text-xs">{formatNumber(b.tokens)}</span>
                    <button className="cursor-pointer rounded p-0.5 hover:bg-muted disabled:opacity-30" disabled={i === 0} onClick={() => move(id, -1)} aria-label="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button className="cursor-pointer rounded p-0.5 hover:bg-muted disabled:opacity-30" disabled={i === order.length - 1} onClick={() => move(id, 1)} aria-label="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <div key={i} className={cn("flex items-start gap-2 rounded-md border p-2.5 text-sm", w.level === "error" ? "border-danger/40 bg-danger-soft" : w.level === "warning" ? "border-warning/40 bg-warning-soft" : "border-success/40 bg-success-soft")}>
                  {w.level === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", w.level === "error" ? "text-danger" : "text-warning")} />}
                  {w.text}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Try: enable the catalogue and handbook, move CONVERSATION to the middle, switch to an 8k window.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <PositionExperiment />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lost-in-the-middle experiment                                      */
/* ------------------------------------------------------------------ */

const FILLERS = [
  "Customer (call #{n}): abhi mujhe kuch nahi chahiye, baad mein dekhenge",
  "Customer (call #{n}): rate kitna hai? thoda zyada lag raha hai",
  "Customer (call #{n}): main already dusre bank se loan le chuka hu",
  "Customer (call #{n}): documents kal bhej dunga, aadhar aur pan",
  "Customer (call #{n}): EMI 12 hazaar se zyada nahi honi chahiye",
  "Customer (call #{n}): mere papa ke naam pe loan chahiye tha",
  "Customer (call #{n}): shaam ko call karo abhi meeting mein hu",
  "Customer (call #{n}): processing fee kitni lagegi?",
];

function buildHaystack(n: number, needleAt: number) {
  const lines: string[] = [];
  for (let i = 0; i < n; i++) lines.push(FILLERS[i % FILLERS.length].replace("{n}", String(i + 1)));
  const needleCall = needleAt + 1;
  lines[needleAt] = `Customer (call #${needleCall}): mujhe exactly 7.5 lakh ka home loan chahiye, Pune mein flat le raha hu`;
  return { text: lines.join("\n"), needleCall };
}

function simulatedCurve(strength: number, contextK: number) {
  const pts = [];
  for (let pos = 0; pos <= 100; pos += 10) {
    const x = pos / 100;
    const dip = 4 * x * (1 - x); // 0 at edges, 1 in the middle
    const lengthFactor = Math.min(1, contextK / 32);
    pts.push({ position: pos, accuracy: Math.max(0, 0.97 - strength * lengthFactor * dip * 0.45 - (x < 0.5 ? 0 : 0.02)) });
  }
  return pts;
}

function PositionExperiment() {
  const [strength, setStrength] = useState(0.6);
  const [contextK, setContextK] = useState(32);
  const [providerId, setProviderId] = useState("mock");
  const [providerLabel, setProviderLabel] = useState("Simulated");
  const [realResults, setRealResults] = useState<{ position: string; correct: boolean; answer: string }[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [showHay, setShowHay] = useState(false);
  const curve = useMemo(() => simulatedCurve(strength, contextK), [strength, contextK]);

  async function runReal() {
    setRunning(true);
    setError("");
    setRealResults(null);
    const p = new BackendProvider(providerId, providerLabel);
    const N = 60;
    const out: { position: string; correct: boolean; answer: string }[] = [];
    try {
      for (const [label, frac] of [["Beginning", 0.02], ["Middle", 0.5], ["End", 0.98]] as const) {
        const at = Math.min(N - 1, Math.floor(frac * N));
        const hay = buildHaystack(N, at);
        const r = await p.generate({
          messages: [
            {
              role: "user",
              content: `Below are notes from ${N} different customer calls.\n\n${hay.text}\n\nQuestion: Which call number mentioned a loan amount of exactly 7.5 lakh, and for what purpose? Answer in one short sentence.`,
            },
          ],
          temperature: 0,
          maxTokens: 60,
        });
        out.push({ position: label, answer: r.text, correct: r.text.includes(`#${hay.needleCall}`) || new RegExp(`\\b${hay.needleCall}\\b`).test(r.text) });
      }
      setRealResults(out);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Experiment: same fact at the beginning, middle or end</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">One key customer utterance hidden among many similar call notes. Does its position change whether the model uses it?</p>
        </div>
        <ModeBadge mode="simulated" detail="Curve shape follows the U-shape reported by Liu et al. (2023), 'Lost in the Middle'. Strength varies a lot by model — newer models often show much smaller effects." />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <div className="space-y-4">
            <LabeledSlider label="Position-effect strength (model-dependent)" value={strength} onChange={setStrength} min={0} max={1} step={0.05} format={(v) => v.toFixed(2)} />
            <LabeledSlider label="Context length (k tokens)" value={contextK} onChange={setContextK} min={2} max={128} step={2} format={(v) => `${v}k`} />
            <p className="text-xs text-muted-foreground">
              This is an illustrative model, not a measurement. The only way to know your model's behaviour is to run the experiment — below.
            </p>
          </div>
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={curve} margin={{ left: -15, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="position" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} label={{ value: "position of key fact in context", position: "insideBottom", offset: -2, fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis domain={[0.4, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => Number(v).toFixed(2)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="accuracy" name="simulated accuracy" stroke="var(--primary)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-3 rounded-lg border p-3">
          <div className="text-sm font-semibold">Run it for real (needle-in-a-haystack, 3 calls)</div>
          <div className="flex flex-wrap items-center gap-2">
            <ProviderPicker
              value={providerId}
              onChange={(id, label) => {
                setProviderId(id);
                setProviderLabel(label);
              }}
            />
            <Button onClick={runReal} disabled={running || providerId === "mock"}>
              {running ? <Loader2 className="animate-spin" /> : <Play />} Run experiment
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowHay((s) => !s)}>
              {showHay ? "Hide" : "Show"} haystack
            </Button>
          </div>
          {providerId === "mock" && <p className="text-xs text-muted-foreground">Select a real provider (requires the backend) — this experiment is only meaningful against a real model.</p>}
          {showHay && <pre className="max-h-48 overflow-auto rounded bg-subtle p-2 font-mono text-[11px]">{buildHaystack(60, 30).text}</pre>}
          {error && <Callout tone="danger">{error}</Callout>}
          {realResults && (
            <div className="space-y-1.5">
              <ModeBadge mode="real-model" detail={providerLabel} />
              {realResults.map((r) => (
                <div key={r.position} className="flex items-start gap-2 text-sm">
                  <Badge variant={r.correct ? "success" : "danger"} className="w-24 justify-center">
                    {r.position}
                  </Badge>
                  <span className="font-mono text-xs">{r.answer}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">One trial per position is an anecdote, not a measurement — repeat with many needles and report accuracy with confidence intervals (see the Significance lesson).</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
