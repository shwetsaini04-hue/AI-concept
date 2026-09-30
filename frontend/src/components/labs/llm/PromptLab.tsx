"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Play, X, ArrowDown } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Switch, Textarea, Callout } from "@/components/ui/primitives";
import { ProviderPicker } from "@/components/shared/ProviderPicker";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { BackendProvider, MockProvider, type LLMProvider } from "@/lib/llm";
import { BAD, EXAMPLES, IMPROVED, TEST_SET, assemble, evaluate, simulate, type ItemResult, type PromptConfig } from "@/lib/llm/promptSim";
import { cn, pct } from "@/lib/utils";

export default function PromptLab() {
  const [cfg, setCfg] = useState<PromptConfig>(BAD);
  const [providerId, setProviderId] = useState("mock");
  const [providerLabel, setProviderLabel] = useState("Simulated model");
  const [results, setResults] = useState<ItemResult[] | null>(null);
  const [runMode, setRunMode] = useState<"real-model" | "simulated">("simulated");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  const provider: LLMProvider = useMemo(
    () => (providerId === "mock" ? new MockProvider(simulate) : new BackendProvider(providerId, providerLabel)),
    [providerId, providerLabel],
  );
  const preview = useMemo(() => assemble(cfg, TEST_SET[0]), [cfg]);

  async function run() {
    setRunning(true);
    setError("");
    setResults(null);
    try {
      const out: ItemResult[] = [];
      for (const conv of TEST_SET) {
        const r = await provider.generate(assemble(cfg, conv));
        out.push(evaluate(conv, r.text));
        setRunMode(r.mode);
      }
      setResults(out);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const summary = results && {
    acc: results.filter((r) => r.labelOk).length / results.length,
    format: results.filter((r) => r.formatOk).length / results.length,
    evidence: results.filter((r) => r.evidenceOk).length / results.length,
  };

  const set = <K extends keyof PromptConfig>(k: K, v: PromptConfig[K]) => {
    setCfg((c) => ({ ...c, [k]: v }));
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Prompt → Model → Output → Evaluation</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setCfg(BAD)}>
              Load bad prompt
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCfg(IMPROVED)}>
              Load improved prompt
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1">
              <Label>System instruction (role)</Label>
              <Textarea rows={3} value={cfg.system} onChange={(e) => set("system", e.target.value)} placeholder="e.g. You are a careful quality analyst…" />
            </div>
            <div className="space-y-1">
              <Label>Task instruction</Label>
              <Textarea rows={3} value={cfg.task} onChange={(e) => set("task", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Constraints, negative instructions & evidence requirements</Label>
              <Textarea rows={6} value={cfg.constraints} onChange={(e) => set("constraints", e.target.value)} placeholder="- Use only customer words as evidence…" className="font-mono text-xs" />
            </div>
            <div className="space-y-1">
              <Label>Output format</Label>
              <Textarea rows={6} value={cfg.outputFormat} onChange={(e) => set("outputFormat", e.target.value)} placeholder='Return only JSON: {"intent": ...}' className="font-mono text-xs" />
            </div>
          </div>
          <div>
            <Label>Few-shot examples (in-context learning)</Label>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {EXAMPLES.map((e) => (
                <Switch
                  key={e.id}
                  checked={cfg.examples.includes(e.id)}
                  onChange={(v) => set("examples", v ? [...cfg.examples, e.id] : cfg.examples.filter((x) => x !== e.id))}
                  label={<span className="text-xs">{e.label}</span>}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <ProviderPicker
              value={providerId}
              onChange={(id, label) => {
                setProviderId(id);
                setProviderLabel(label);
              }}
            />
            <Button onClick={run} disabled={running}>
              {running ? <Loader2 className="animate-spin" /> : <Play />} Run on {TEST_SET.length} test transcripts
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowPrompt((s) => !s)}>
              {showPrompt ? "Hide" : "Show"} assembled prompt
            </Button>
          </div>
          {showPrompt && (
            <pre className="max-h-80 overflow-auto rounded-lg border bg-subtle p-3 font-mono text-xs whitespace-pre-wrap">
              {preview.system ? `[SYSTEM]\n${preview.system}\n\n` : ""}[USER]\n{preview.messages[0].content}
            </pre>
          )}
          {providerId === "mock" && (
            <Callout tone="warning" title="About the simulated model">
              The simulator is deterministic code that reproduces well-known LLM failure modes (forced guessing without an abstain option, anchoring on objections,
              missing sarcasm, prose instead of JSON, paraphrased evidence) and fixes them when your prompt addresses them. It is a teaching instrument — not an LLM. Connect the
              backend to run the same prompts against a real model.
            </Callout>
          )}
          {error && <Callout tone="danger">Model call failed: {error}</Callout>}
        </CardContent>
      </Card>

      {results && summary && (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Evaluation</CardTitle>
            <ModeBadge mode={runMode} detail={runMode === "real-model" ? providerLabel : "rule-based simulator"} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Label accuracy" v={summary.acc} />
              <Metric label="Valid JSON + enum" v={summary.format} />
              <Metric label="Verbatim customer evidence" v={summary.evidence} />
            </div>
            <div className="space-y-2">
              {results.map((r) => (
                <details key={r.conv.id} className="rounded-md border">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    {r.labelOk ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />}
                    <span className="font-medium">{r.conv.title}</span>
                    <Badge variant="muted">gold: {r.conv.gold.intent}</Badge>
                    <Badge variant={r.labelOk ? "success" : "danger"}>pred: {r.label ?? "unparseable"}</Badge>
                    <Badge variant={r.formatOk ? "success" : "warning"}>{r.formatOk ? "format ok" : "format invalid"}</Badge>
                    <Badge variant={r.evidenceOk ? "success" : r.evidenceOk === null ? "muted" : "danger"}>{r.evidenceNote}</Badge>
                  </summary>
                  <div className="space-y-2 border-t p-3">
                    <pre className="whitespace-pre-wrap rounded bg-subtle p-2 font-mono text-xs">{r.raw}</pre>
                    <div className="text-xs text-muted-foreground">{r.conv.gold.notes}</div>
                  </div>
                </details>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowDown className="h-3.5 w-3.5" />
              Notice the diarization case (“Agent puts words in the customer's mouth”): even a great prompt cites the mislabelled turn. Some errors must be fixed upstream, not in the prompt.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, v }: { label: string; v: number }) {
  return (
    <div className={cn("rounded-lg border p-3", v >= 0.8 ? "border-success/40 bg-success-soft" : v >= 0.5 ? "border-warning/40 bg-warning-soft" : "border-danger/40 bg-danger-soft")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{pct(v)}</div>
    </div>
  );
}
