"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, Loader2, Play, Trophy, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, ProgressBar, Select, Switch, Textarea, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { ProviderPicker } from "@/components/shared/ProviderPicker";
import { TranscriptViewer } from "@/components/shared/TranscriptViewer";
import { JsonEditor } from "@/components/lesson/QuestionCard";
import { useHydrated, useProgress } from "@/lib/store/progress";
import { BackendProvider, MockProvider } from "@/lib/llm";
import { BAD, EXAMPLES, TEST_SET, assemble, evaluate, simulate } from "@/lib/llm/promptSim";
import { validateJson } from "@/lib/llm/schema";
import { mcnemar } from "@/lib/metrics/stats";
import {
  ARCH_DECISIONS,
  CANON,
  CAP_CONVS,
  COMPARE,
  EDGE_CASES,
  PILOT,
  initialCapstone,
  parseAmount,
  runMetrics,
  scoreCapstone,
  type CapState,
} from "@/lib/capstone";
import { cn, pct } from "@/lib/utils";

const STEPS = [
  "Design the taxonomy",
  "Annotation guidelines",
  "Label data",
  "Build prompts",
  "Define JSON schema",
  "Evaluation design",
  "Error analysis",
  "Compare two approaches",
  "Architecture decisions",
  "Final report & score",
];

const TARGET_OUTPUT = `{
  "intent": "...",
  "entities": {...},
  "evidence": "...",
  "confidence": 0.0,
  "reason": "...",
  "needs_review": true
}`;

export default function CapstonePage() {
  const hydrated = useHydrated();
  const raw = useProgress((s) => s.capstone);
  const setCapstone = useProgress((s) => s.setCapstone);
  const [step, setStep] = useState(0);
  const cap: CapState = useMemo(() => ({ ...initialCapstone(BAD), ...(raw as Partial<CapState>) }), [raw]);
  const set = (patch: Partial<CapState>) => setCapstone(patch as Record<string, unknown>);
  const score = useMemo(() => scoreCapstone(cap), [cap]);

  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning">
          <Trophy className="h-4 w-4" /> Capstone project
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Build a Transcript Intelligence Pipeline</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Analyze noisy call transcripts and determine customer intent with evidence and confidence. You decide the taxonomy, labeling strategy, prompts, schema, evaluation, error handling and architecture.
          Your work is scored live against the rubric on the right — nothing is hidden. Progress saves automatically.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-3 text-sm">
            <div className="text-xs font-semibold text-muted-foreground">Input</div>Noisy transcript (Hinglish, ASR errors, diarization errors)
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs font-semibold text-muted-foreground">Required output</div>
            <pre className="font-mono text-[11px]">{TARGET_OUTPUT}</pre>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                className={cn("shrink-0 cursor-pointer rounded-md border px-2.5 py-1.5 text-xs", step === i ? "border-primary bg-primary-soft font-medium text-primary" : "hover:bg-muted")}
              >
                {i + 1}. {s}
              </button>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>
                Step {step + 1}: {STEPS[step]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 0 && <StepTaxonomy cap={cap} set={set} />}
              {step === 1 && <StepGuidelines cap={cap} set={set} />}
              {step === 2 && <StepLabel cap={cap} set={set} />}
              {step === 3 && <StepPrompt cap={cap} set={set} />}
              {step === 4 && <StepSchema cap={cap} set={set} />}
              {step === 5 && <StepEval cap={cap} set={set} />}
              {step === 6 && <StepErrors cap={cap} set={set} />}
              {step === 7 && <StepCompare cap={cap} set={set} />}
              {step === 8 && <StepArch cap={cap} set={set} />}
              {step === 9 && <StepReport cap={cap} set={set} score={score} />}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft /> Previous
            </Button>
            <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}>
              Next step <ChevronRight />
            </Button>
          </div>
        </div>
        <Rubric score={score} />
      </div>
    </div>
  );
}

type StepProps = { cap: CapState; set: (p: Partial<CapState>) => void };

function Rubric({ score }: { score: ReturnType<typeof scoreCapstone> }) {
  return (
    <div className="space-y-3 xl:sticky xl:top-20 xl:self-start">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            Rubric <span className="font-mono text-2xl">{Math.round(score.total)}/100</span>
          </CardTitle>
          <ProgressBar value={score.total / 100} tone={score.total >= 75 ? "success" : score.total >= 50 ? "warning" : "primary"} />
        </CardHeader>
        <CardContent className="max-h-[70vh] space-y-2 overflow-y-auto">
          {score.criteria.map((c) => (
            <details key={c.name} className="rounded-md border p-2">
              <summary className="flex cursor-pointer items-center justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="font-mono text-xs">
                  {c.earned}/{c.max}
                </span>
              </summary>
              <ul className="mt-2 space-y-1">
                {c.checks.map((k) => (
                  <li key={k.label} className="flex items-start gap-1.5 text-[11px]">
                    {k.earned >= k.pts ? <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" /> : k.earned > 0 ? <Check className="mt-0.5 h-3 w-3 shrink-0 text-warning" /> : <X className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />}
                    <span className="flex-1">{k.label}</span>
                    <span className="font-mono">
                      {k.earned}/{k.pts}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------- Steps ------------------------------- */

function StepTaxonomy({ cap, set }: StepProps) {
  const t = cap.taxonomy;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Define the intent label set (one per line) and the objection categories. Decide whether product, intent and objections are separate output fields.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Intent labels</Label>
          <Textarea rows={6} className="font-mono text-sm" value={t.intents} onChange={(e) => set({ taxonomy: { ...t, intents: e.target.value } })} />
        </div>
        <div className="space-y-1">
          <Label>Objection categories</Label>
          <Textarea rows={6} className="font-mono text-sm" value={t.objections} onChange={(e) => set({ taxonomy: { ...t, objections: e.target.value } })} />
        </div>
      </div>
      <Switch checked={t.separateFields} onChange={(v) => set({ taxonomy: { ...t, separateFields: v } })} label={<span className="text-sm">Product, intent and objections will be separate fields in the output schema</span>} />
      <Callout tone="info">Revisit the Taxonomy Design and Open vs Closed Set lessons if unsure. The rubric checks for an abstain label, a single dimension, 3–8 objection categories with an “Other”, and separate fields.</Callout>
    </div>
  );
}

function StepGuidelines({ cap, set }: StepProps) {
  const intents = cap.taxonomy.intents.split("\n").map((x) => x.trim()).filter(Boolean);
  const g = cap.guidelines;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Write a definition for each of your intent labels, then rule on five edge cases annotators will otherwise disagree on.</p>
      {intents.map((l) => (
        <div key={l} className="space-y-1">
          <Label>{l} — definition</Label>
          <Textarea rows={2} value={g.defs[l] ?? ""} onChange={(e) => set({ guidelines: { ...g, defs: { ...g.defs, [l]: e.target.value } } })} placeholder="Customer explicitly… Includes… Excludes…" />
        </div>
      ))}
      <div className="space-y-2 border-t pt-3">
        <div className="text-sm font-medium">Edge-case rulings</div>
        {EDGE_CASES.map((e) => (
          <div key={e.id} className="grid gap-2 md:grid-cols-[1fr_1fr] md:items-center">
            <span className="font-mono text-xs">{e.text}</span>
            <Input value={g.rulings[e.id] ?? ""} onChange={(ev) => set({ guidelines: { ...g, rulings: { ...g.rulings, [e.id]: ev.target.value } } })} placeholder="Label + rule, e.g. Not Interested + referral flag" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StepLabel({ cap, set }: StepProps) {
  const [i, setI] = useState(0);
  const c = CAP_CONVS[i];
  const l = cap.labels[c.id] ?? { intent: "", amount: "", evidence: [] };
  const upd = (p: Partial<typeof l>) => set({ labels: { ...cap.labels, [c.id]: { ...l, ...p } } });
  const done = CAP_CONVS.filter((x) => cap.labels[x.id]?.intent).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Label 8 calls: intent (mapped to the canonical 3 labels for scoring), the loan amount as an integer in ₹ (blank if none) and the evidence turns. {done}/8 labelled.
        </p>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} aria-label="Previous call">
            <ChevronLeft />
          </Button>
          <span className="px-2 text-xs">{i + 1}/8</span>
          <Button size="icon" variant="outline" onClick={() => setI((x) => Math.min(7, x + 1))} disabled={i === 7} aria-label="Next call">
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Click turns to mark them as evidence. Speaker labels are the (possibly wrong) diarization output.</div>
      <TranscriptViewer
        turns={c.turns.map((t) => ({ speaker: t.asrSpeaker ?? t.speaker, text: t.text }))}
        selectable
        selected={l.evidence}
        onToggle={(t) => upd({ evidence: l.evidence.includes(t) ? l.evidence.filter((x) => x !== t) : [...l.evidence, t] })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Intent</Label>
          <Select value={l.intent} onChange={(e) => upd({ intent: e.target.value })} className="w-full">
            <option value="">Choose…</option>
            {CANON.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Loan amount (₹ integer, blank if none)</Label>
          <Input value={l.amount} onChange={(e) => upd({ amount: e.target.value })} placeholder="e.g. 500000" className={cn(Number.isNaN(parseAmount(l.amount) as number) && "border-danger")} />
        </div>
      </div>
    </div>
  );
}

function StepPrompt({ cap, set }: StepProps) {
  const p = cap.prompt;
  const [providerId, setProviderId] = useState("mock");
  const [label, setLabel] = useState("Simulated");
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState("");
  const upd = (patch: Partial<typeof p>) => set({ prompt: { ...p, ...patch } });

  async function run() {
    setRunning(true);
    setErr("");
    try {
      const prov = providerId === "mock" ? new MockProvider(simulate) : new BackendProvider(providerId, label);
      const results = [];
      let mode: "simulated" | "real-model" = "simulated";
      for (const conv of TEST_SET) {
        const r = await prov.generate(assemble(p, conv));
        mode = r.mode;
        results.push(evaluate(conv, r.text));
      }
      const report = runMetrics(results.map((r) => ({ gold: r.conv.gold.intent, pred: r.label?.toLowerCase().replace(/ /g, "_") ?? null })));
      set({
        promptRun: {
          acc: results.filter((r) => r.labelOk).length / results.length,
          macroF1: report.macro.f1,
          evidence: results.filter((r) => r.evidenceOk).length / results.length,
          format: results.filter((r) => r.formatOk).length / results.length,
          mode,
          at: Date.now(),
        },
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Write the prompt your pipeline will use. It runs on 6 held-out test calls. (Tip: the Prompt Engineering lesson has a playground with the same simulator.)</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>System</Label>
          <Textarea rows={3} value={p.system} onChange={(e) => upd({ system: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Task</Label>
          <Textarea rows={3} value={p.task} onChange={(e) => upd({ task: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Rules / constraints</Label>
          <Textarea rows={6} className="font-mono text-xs" value={p.constraints} onChange={(e) => upd({ constraints: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Output format</Label>
          <Textarea rows={6} className="font-mono text-xs" value={p.outputFormat} onChange={(e) => upd({ outputFormat: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {EXAMPLES.map((e) => (
          <Switch key={e.id} checked={p.examples.includes(e.id)} onChange={(v) => upd({ examples: v ? [...p.examples, e.id] : p.examples.filter((x) => x !== e.id) })} label={<span className="text-xs">{e.label}</span>} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <ProviderPicker
          value={providerId}
          onChange={(id, l) => {
            setProviderId(id);
            setLabel(l);
          }}
        />
        <Button onClick={run} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <Play />} Run on test set
        </Button>
      </div>
      {err && <Callout tone="danger">{err}</Callout>}
      {cap.promptRun && (
        <div className="flex flex-wrap items-center gap-2">
          <ModeBadge mode={cap.promptRun.mode} />
          <Badge variant="muted">accuracy {pct(cap.promptRun.acc)}</Badge>
          <Badge variant="muted">macro-F1 {cap.promptRun.macroF1.toFixed(2)}</Badge>
          <Badge variant="muted">valid JSON {pct(cap.promptRun.format)}</Badge>
          <Badge variant="muted">verbatim customer evidence {pct(cap.promptRun.evidence)}</Badge>
        </div>
      )}
    </div>
  );
}

function StepSchema({ cap, set }: StepProps) {
  const example = `{"intent": "interested", "entities": {"amount": 500000, "loan_type": "personal"}, "evidence": "main kal tak apply kar dunga", "confidence": 0.86, "reason": "Explicit commitment to apply.", "needs_review": false}`;
  const v = validateJson(cap.schema, example);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Write the JSON Schema for the final output. The sample output below is validated against it live.</p>
      <JsonEditor value={cap.schema} onChange={(s) => set({ schema: s })} height="320px" />
      <div className="rounded-lg border p-3 text-sm">
        <div className="font-mono text-xs text-muted-foreground">{example}</div>
        <div className={cn("mt-2 font-medium", v.valid ? "text-success" : "text-danger")}>{v.schemaError ?? (v.valid ? "Sample output is valid against your schema ✓" : `Sample output fails: ${v.errors.join("; ")}`)}</div>
      </div>
    </div>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-full">
        <option value="">Choose…</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
    </div>
  );
}

function StepEval({ cap, set }: StepProps) {
  const d = cap.evalDesign;
  const upd = (p: Partial<typeof d>) => set({ evalDesign: { ...d, ...p } });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Design how you'll know whether the system works. Traffic: ~60% insufficient/not interested, ~30% interested; 45% of calls are noisy.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <Choice
          label="Primary metric for intent"
          value={d.metric}
          onChange={(v) => upd({ metric: v })}
          options={[
            ["accuracy", "Accuracy"],
            ["macro-f1", "Macro-F1 (+ per-class precision/recall)"],
            ["per-class", "Per-class precision & recall, weighted by business cost"],
            ["micro-f1", "Micro-F1"],
          ]}
        />
        <Choice label="Gold set size" value={d.size} onChange={(v) => upd({ size: v })} options={[["50", "50 calls"], ["300", "300 calls"], ["1000", "1,000 calls"]]} />
        <Choice
          label="Stratification"
          value={d.stratify}
          onChange={(v) => upd({ stratify: v })}
          options={[
            ["none", "Random sample"],
            ["intent", "Stratify by predicted intent"],
            ["language-quality", "Stratify by language × transcript quality (re-weight to traffic)"],
          ]}
        />
        <Choice
          label="Splits"
          value={d.splits}
          onChange={(v) => upd({ splits: v })}
          options={[
            ["single", "One labelled set for everything"],
            ["train-dev-test", "Train (examples) / dev (iterate) / test (final)"],
          ]}
        />
        <Choice
          label="How the test set is used"
          value={d.testUse}
          onChange={(v) => upd({ testUse: v })}
          options={[
            ["iterate", "Check it after every prompt change"],
            ["final-only", "Touch it once, for the final estimate"],
          ]}
        />
        <Choice
          label="Label reliability"
          value={d.iaa}
          onChange={(v) => upd({ iaa: v })}
          options={[
            ["none", "Trust single annotations"],
            ["double", "Double-label 15% and report Cohen's κ; adjudicate"],
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <Switch checked={d.perStage} onChange={(v) => upd({ perStage: v })} label={<span className="text-sm">Evaluate each stage separately (speakers, entities, intent, evidence)</span>} />
        <Switch checked={d.calibration} onChange={(v) => upd({ calibration: v })} label={<span className="text-sm">Check calibration of confidence before auto-approving</span>} />
      </div>
    </div>
  );
}

function StepErrors({ cap, set }: StepProps) {
  const e = cap.errors;
  const upd = (p: Partial<typeof e>) => set({ errors: { ...e, ...p } });
  const table = (title: string, obj: Record<string, number>) => (
    <div className="rounded-lg border p-3">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{title}</div>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex justify-between text-sm">
          <span>{k}</span>
          <span className={cn("font-mono", v < 0.7 && "text-danger")}>{v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Pilot run: overall F1 {PILOT.overall}. Slice results:</p>
        <ModeBadge mode="precomputed" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {table("By language", PILOT.language)}
        {table("By transcript quality", PILOT.quality)}
        {table("By agent", PILOT.agent)}
      </div>
      <div className="rounded-lg border p-3 text-sm">
        <div className="mb-1 text-xs font-semibold text-muted-foreground">Agent × quality (F1)</div>
        {Object.entries(PILOT.cross).map(([a, q]) => (
          <div key={a} className="flex gap-4">
            <span className="w-20">{a}</span>
            {Object.entries(q).map(([k, v]) => (
              <span key={k} className="font-mono text-xs">
                {k}: {v.toFixed(2)}
              </span>
            ))}
          </div>
        ))}
        <div className="mt-1 text-xs text-muted-foreground">Share of Agent B's calls that are noisy/very noisy: 70% (A: 30%, C: 40%). Traffic: clean 55%, noisy 30%, very noisy 15%.</div>
      </div>
      <Choice
        label="Most likely root cause"
        value={e.rootCause}
        onChange={(v) => upd({ rootCause: v })}
        options={[
          ["agent", "Agent B is a poor agent"],
          ["quality", "Transcript quality (ASR noise); Agent B is confounded by handling noisier calls"],
          ["language", "The model can't handle Hinglish at all"],
        ]}
      />
      <Choice
        label="What to prioritize first"
        value={e.priority}
        onChange={(v) => upd({ priority: v })}
        options={[
          ["romanized", "Romanized Hindi (lowest language F1)"],
          ["noisy", "Noisy + very noisy transcripts (45% of traffic, lowest F1)"],
          ["agentB", "Retrain Agent B"],
        ]}
      />
      <div className="space-y-1">
        <Label>Your fix plan (what will you change, and how will you measure it?)</Label>
        <Textarea rows={3} value={e.fix} onChange={(ev) => upd({ fix: ev.target.value })} />
      </div>
    </div>
  );
}

function StepCompare({ cap, set }: StepProps) {
  const c = cap.compare;
  const upd = (p: Partial<typeof c>) => set({ compare: { ...c, ...p } });
  const mc = mcnemar(COMPARE.b, COMPARE.c);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Both approaches were run on the same {COMPARE.n} gold calls.</p>
        <ModeBadge mode="precomputed" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1">Approach</th>
              <th className="py-1 text-right">Accuracy</th>
              <th className="py-1 text-right">Macro-F1</th>
              <th className="py-1 text-right">$ / 1k calls</th>
              <th className="py-1 text-right">p95 latency</th>
            </tr>
          </thead>
          <tbody>
            {[COMPARE.A, COMPARE.B].map((a) => (
              <tr key={a.name} className="border-t">
                <td className="py-1.5">{a.name}</td>
                <td className="py-1.5 text-right font-mono">{pct(a.acc)}</td>
                <td className="py-1.5 text-right font-mono">{a.macroF1.toFixed(2)}</td>
                <td className="py-1.5 text-right font-mono">${a.cost.toFixed(2)}</td>
                <td className="py-1.5 text-right font-mono">{a.p95}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-sm">
        Discordant pairs: A right & B wrong = <b>{COMPARE.b}</b>, A wrong & B right = <b>{COMPARE.c}</b>.
      </div>
      <Choice
        label={`Is B's improvement statistically significant at α = 0.05? (hint: McNemar)`}
        value={c.significant}
        onChange={(v) => upd({ significant: v })}
        options={[
          ["yes", "Yes"],
          ["no", "No"],
          ["cant", "Can't tell without more data"],
        ]}
      />
      {c.significant && (
        <Callout tone={c.significant === "yes" ? "success" : "warning"}>
          McNemar exact p = {mc.pExact.toFixed(3)}. {c.significant === "yes" ? "Correct — the paired test uses the fact both ran on the same calls." : "The paired test says the difference is significant at 0.05."}
        </Callout>
      )}
      <Choice
        label="Which do you ship for nightly batch analytics (budget $10 / 1k calls, no latency limit)?"
        value={c.ship}
        onChange={(v) => upd({ ship: v })}
        options={[
          ["A", "A: single call"],
          ["B", "B: staged pipeline"],
        ]}
      />
      {c.ship && (
        <Callout tone={c.ship === "B" ? "success" : "warning"}>
          {c.ship === "B"
            ? "B: a significant quality gain within budget, and latency doesn't matter for nightly batch. (For real-time assist, the answer would flip.)"
            : "A is cheaper and faster, but the budget allows B and its gain is significant — for batch analytics, B is the stronger choice."}
        </Callout>
      )}
      <div className="space-y-1">
        <Label>Justification</Label>
        <Textarea rows={2} value={c.why} onChange={(e) => upd({ why: e.target.value })} />
      </div>
    </div>
  );
}

function StepArch({ cap, set }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Decide the rest of the system. Feedback appears once you choose.</p>
      {ARCH_DECISIONS.map((a) => {
        const chosen = a.options.find((o) => o.v === cap.arch[a.id]);
        const best = Math.max(...a.options.map((o) => o.pts));
        return (
          <div key={a.id} className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-semibold">{a.question}</div>
            <div className="space-y-1.5">
              {a.options.map((o) => (
                <button
                  key={o.v}
                  onClick={() => set({ arch: { ...cap.arch, [a.id]: o.v } })}
                  className={cn("block w-full cursor-pointer rounded-md border px-3 py-1.5 text-left text-sm hover:bg-muted", cap.arch[a.id] === o.v && (o.pts === best ? "border-success bg-success-soft" : "border-warning bg-warning-soft"))}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {chosen && <p className="mt-2 text-xs text-muted-foreground">{chosen.why}</p>}
          </div>
        );
      })}
    </div>
  );
}

function StepReport({ cap, set, score }: StepProps & { score: ReturnType<typeof scoreCapstone> }) {
  const [saved, setSaved] = useState(false);
  const md = useMemo(() => {
    const lines = [
      "# Transcript Intelligence Pipeline — Evaluation Report",
      "",
      `**Score:** ${Math.round(score.total)}/100`,
      "",
      "## Taxonomy",
      `- Intent labels: ${cap.taxonomy.intents.split("\n").filter(Boolean).join(", ")}`,
      `- Objections: ${cap.taxonomy.objections.split("\n").filter(Boolean).join(", ")}`,
      `- Separate fields: ${cap.taxonomy.separateFields ? "yes" : "no"}`,
      "",
      "## Prompt run",
      cap.promptRun ? `- Mode: ${cap.promptRun.mode}; accuracy ${pct(cap.promptRun.acc)}, macro-F1 ${cap.promptRun.macroF1.toFixed(2)}, valid JSON ${pct(cap.promptRun.format)}, verbatim evidence ${pct(cap.promptRun.evidence)}` : "- Not run",
      "",
      "## Evaluation design",
      `- Metric: ${cap.evalDesign.metric || "—"}; gold set ${cap.evalDesign.size || "—"} (${cap.evalDesign.stratify || "—"}); splits ${cap.evalDesign.splits || "—"}; test use ${cap.evalDesign.testUse || "—"}`,
      `- IAA: ${cap.evalDesign.iaa || "—"}; per-stage: ${cap.evalDesign.perStage}; calibration: ${cap.evalDesign.calibration}`,
      "",
      "## Error analysis",
      `- Root cause: ${cap.errors.rootCause || "—"}; priority: ${cap.errors.priority || "—"}`,
      `- Fix plan: ${cap.errors.fix || "—"}`,
      "",
      "## Approach comparison",
      `- Significant: ${cap.compare.significant || "—"}; ship: ${cap.compare.ship || "—"}. ${cap.compare.why}`,
      "",
      "## Architecture",
      ...ARCH_DECISIONS.map((a) => `- ${a.question}: ${a.options.find((o) => o.v === cap.arch[a.id])?.label ?? "—"}`),
      "",
      "## Rubric",
      ...score.criteria.map((c) => `- ${c.name}: ${c.earned}/${c.max}`),
      "",
      "## Executive summary",
      cap.summary || "(none)",
    ];
    return lines.join("\n");
  }, [cap, score]);

  function download() {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "capstone-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {score.criteria.map((c) => (
          <div key={c.name} className="rounded-lg border p-2.5">
            <div className="text-[11px] text-muted-foreground">{c.name}</div>
            <div className="font-mono text-lg font-semibold">
              {c.earned}/{c.max}
            </div>
            <ProgressBar value={c.earned / c.max} className="mt-1 h-1.5" />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label>Executive summary (for your stakeholders — not scored)</Label>
        <Textarea rows={4} value={cap.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="What you built, how well it works (with CIs), where it fails, what you'll do next." />
      </div>
      <pre className="max-h-80 overflow-auto rounded-lg border bg-subtle p-3 font-mono text-xs whitespace-pre-wrap">{md}</pre>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            set({ lastScore: score.total });
            setSaved(true);
          }}
        >
          <Trophy /> Submit final score ({Math.round(score.total)}/100)
        </Button>
        <Button variant="outline" onClick={download}>
          <Download /> Download report.md
        </Button>
      </div>
      {saved && <Callout tone="success">Score saved to your dashboard. You can keep improving any step and resubmit.</Callout>}
    </div>
  );
}
