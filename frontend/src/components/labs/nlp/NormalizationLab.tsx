"use client";

import { useMemo, useState } from "react";
import { ArrowDown, Check, ShieldAlert, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Textarea } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { PRESERVATION_CASES, runPipeline, STAGES, wordDiff, type StageId } from "@/lib/nlp/normalize";
import { cn } from "@/lib/utils";

const PRESETS = [
  "sir mujhe PL chahiye... personal lon ke liye",
  "haan haan,, 5 lac ka loan chaiye   teen saal ke liye",
  "Customer: nhi nhi mujhe abhi lone nahin chahie",
  "rate 10.5 percent hai kya?? mujhe 50 L ka HL chahiye",
];

const SAFE: StageId[] = ["whitespace", "punct", "spelling", "romanization", "numbers"];
const PROGRESSIVE: StageId[] = ["lowercase", "whitespace", "punct", "spelling", "romanization", "abbrev", "numbers", "semantic"];

export default function NormalizationLab() {
  const [text, setText] = useState(PRESETS[0]);
  const [enabled, setEnabled] = useState<StageId[]>(["lowercase", "whitespace", "punct"]);

  const steps = useMemo(() => runPipeline(text, enabled), [text, enabled]);
  const cases = useMemo(
    () =>
      PRESERVATION_CASES.map((c) => {
        const out = runPipeline(c.input, enabled).at(-1)?.output ?? c.input;
        return { ...c, out, ok: c.check(out) };
      }),
    [enabled],
  );
  const broken = cases.filter((c) => !c.ok).length;

  const toggle = (id: StageId) => setEnabled((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Progressive normalization playground</CardTitle>
          <ModeBadge mode="computed" detail="Transparent rule-based normalizers — every rule is visible in lib/nlp/normalize.ts." />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setText(p)} className="cursor-pointer rounded-md border bg-card px-2 py-1 font-mono text-[11px] hover:bg-muted">
                {p.length > 38 ? p.slice(0, 38) + "…" : p}
              </button>
            ))}
          </div>
          <Textarea rows={2} className="font-mono" value={text} onChange={(e) => setText(e.target.value)} aria-label="Transcript text" />

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Stages (applied top-to-bottom in this fixed order):</span>
              <Button size="sm" variant="outline" onClick={() => setEnabled(PROGRESSIVE)}>
                Progressive (Original → Semantic)
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEnabled(SAFE)}>
                Conservative set
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEnabled(STAGES.map((s) => s.id))}>
                Everything
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEnabled([])}>
                Clear
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {STAGES.map((s, i) => {
                const on = enabled.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-left text-xs transition-colors",
                      on ? (s.risky ? "border-danger/50 bg-danger-soft" : "border-primary/50 bg-primary-soft") : "hover:bg-muted",
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span>
                      <span className="font-mono text-muted-foreground">{i + 1}.</span> <span className="font-semibold">{s.label}</span>
                      {s.risky && <ShieldAlert className="ml-1 inline h-3 w-3 text-danger" />}
                      <span className="block text-muted-foreground">{s.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <StepRow label="Original" text={text} prev={null} />
            {steps.map((s, i) => (
              <div key={s.stage.id}>
                <div className="flex justify-center py-0.5 text-muted-foreground">
                  <ArrowDown className="h-3.5 w-3.5" />
                </div>
                <StepRow label={s.stage.label} text={s.output} prev={i === 0 ? text : steps[i - 1].output} risky={s.stage.risky} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Information-preservation tests</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Your current pipeline is run on cases where normalization is known to destroy information.</p>
          </div>
          <Badge variant={broken ? "danger" : "success"}>
            {broken ? `${broken} of ${cases.length} properties destroyed` : "All properties preserved"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {cases.map((c, i) => (
            <div key={i} className={cn("rounded-md border p-3 text-sm", c.ok ? "border-success/30" : "border-danger/40 bg-danger-soft")}>
              <div className="flex items-start gap-2">
                {c.ok ? <Check className="mt-0.5 h-4 w-4 text-success" /> : <X className="mt-0.5 h-4 w-4 text-danger" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.property}</div>
                  <div className="mt-1 grid gap-1 font-mono text-xs sm:grid-cols-2">
                    <span className="truncate text-muted-foreground">in: {c.input}</span>
                    <span className="truncate">out: {c.out}</span>
                  </div>
                  {!c.ok && <div className="mt-1 text-xs">{c.lesson}</div>}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StepRow({ label, text, prev, risky }: { label: string; text: string; prev: string | null; risky?: boolean }) {
  const diff = prev === null ? null : wordDiff(prev, text);
  const changed = diff ? diff.some((d) => d.type !== "same") : false;
  return (
    <div className={cn("grid gap-2 rounded-md border bg-card p-2.5 sm:grid-cols-[180px_1fr]", risky && "border-danger/40")}>
      <div className="flex items-center gap-2 text-xs font-semibold">
        {label}
        {prev !== null && !changed && <Badge variant="muted">no change</Badge>}
      </div>
      <div className="font-mono text-[13px] leading-relaxed">
        {diff
          ? diff.map((d, i) => (
              <span
                key={i}
                className={cn(
                  "mr-1 inline-block rounded px-0.5",
                  d.type === "add" && "bg-success-soft text-success",
                  d.type === "del" && "bg-danger-soft text-danger line-through",
                )}
              >
                {d.text}
              </span>
            ))
          : text}
      </div>
    </div>
  );
}
