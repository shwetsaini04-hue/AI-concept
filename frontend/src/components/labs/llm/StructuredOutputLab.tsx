"use client";

import { useMemo, useState } from "react";
import { Check, X, ChevronRight, RotateCcw } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { JsonEditor } from "@/components/lesson/QuestionCard";
import { validateJson } from "@/lib/llm/schema";
import { cn } from "@/lib/utils";

const SCHEMA = `{
  "type": "object",
  "required": ["loan_type", "amount", "interest_rate_mentioned", "intent"],
  "additionalProperties": false,
  "properties": {
    "loan_type": { "enum": ["personal", "home", "vehicle", "none"] },
    "amount": { "type": ["integer", "null"], "minimum": 0 },
    "interest_rate_mentioned": { "type": "boolean" },
    "intent": { "enum": ["interested", "not_interested", "insufficient_evidence"] },
    "evidence": { "type": "string" }
  }
}`;

const EXPECTED = `{
  "loan_type": "personal",
  "amount": 500000,
  "interest_rate_mentioned": true,
  "intent": "interested"
}`;

const PROBLEMS = [
  "Invalid JSON syntax",
  "Wrong type",
  "Enum violation",
  "Missing required field",
  "Unexpected extra field",
  "Not raw JSON (wrapped in prose/markdown)",
  "Truncated output (max_tokens)",
  "Schema-valid but factually wrong",
] as const;

const MALFORMED: { output: string; problem: (typeof PROBLEMS)[number]; lesson: string }[] = [
  {
    output: `{\n  "loan_type": "personal",\n  "amount": 500000,\n  "interest_rate_mentioned": true,\n  "intent": "interested",\n}`,
    problem: "Invalid JSON syntax",
    lesson: "Trailing commas are legal in JavaScript but not JSON. Use a strict parser and, where available, JSON mode / constrained decoding.",
  },
  {
    output: `{\n  "loan_type": "personal",\n  "amount": "5 lakh",\n  "interest_rate_mentioned": true,\n  "intent": "interested"\n}`,
    problem: "Wrong type",
    lesson: "The model copied the surface form. Either ask for an integer in rupees and validate, or extract the span and normalize it deterministically in code.",
  },
  {
    output: `{\n  "loan_type": "personal",\n  "amount": 500000,\n  "interest_rate_mentioned": true,\n  "intent": "Interested"\n}`,
    problem: "Enum violation",
    lesson: "“Interested” ≠ “interested”. Downstream code comparing strings silently drops these. Enums must be exact.",
  },
  {
    output: `{\n  "loan_type": "personal",\n  "amount": 500000,\n  "interest_rate_mentioned": true\n}`,
    problem: "Missing required field",
    lesson: "Required fields must always be present — use null for 'unknown' rather than omitting the key.",
  },
  {
    output: `{\n  "loan_type": "personal",\n  "amount": 500000,\n  "interest_rate_mentioned": true,\n  "intent": "interested",\n  "customer_mood": "happy"\n}`,
    problem: "Unexpected extra field",
    lesson: "Extra fields often signal the model is improvising. additionalProperties: false makes that visible.",
  },
  {
    output: "Sure! Here is the extracted information:\n```json\n{\"loan_type\": \"personal\", \"amount\": 500000, \"interest_rate_mentioned\": true, \"intent\": \"interested\"}\n```",
    problem: "Not raw JSON (wrapped in prose/markdown)",
    lesson: "Chatty wrappers break json.loads. Instruct 'return only JSON', use JSON mode, and still write a tolerant extractor for fences.",
  },
  {
    output: `{\n  "loan_type": "personal",\n  "amount": 500000,\n  "interest_rate_men`,
    problem: "Truncated output (max_tokens)",
    lesson: "Generation stopped at the token limit mid-object. Check the stop reason; raise max_tokens or shorten the output (e.g., drop long reasoning fields).",
  },
  {
    output: `{\n  "loan_type": "personal",\n  "amount": 50000,\n  "interest_rate_mentioned": true,\n  "intent": "interested"\n}`,
    problem: "Schema-valid but factually wrong",
    lesson: "5 lakh = 500,000, not 50,000. Schemas guarantee shape, not truth. You need grounding checks (does the value appear in the transcript?) and evaluation.",
  },
];

/* Constrained decoding stepper (illustrative distributions). */
const STEPS: { prefix: string; candidates: { tok: string; p: number; allowed: boolean }[]; note: string }[] = [
  {
    prefix: "",
    candidates: [
      { tok: "Sure", p: 0.35, allowed: false },
      { tok: "{", p: 0.3, allowed: true },
      { tok: "```", p: 0.25, allowed: false },
      { tok: "Here", p: 0.1, allowed: false },
    ],
    note: "The grammar says the output must start with “{”. Every other token's logit is set to −∞.",
  },
  {
    prefix: "{",
    candidates: [
      { tok: '"intent"', p: 0.55, allowed: true },
      { tok: '"Intent"', p: 0.2, allowed: false },
      { tok: '"label"', p: 0.15, allowed: false },
      { tok: "\\n", p: 0.1, allowed: true },
    ],
    note: "Only property names defined in the schema (and whitespace) are legal.",
  },
  {
    prefix: '{"intent": "',
    candidates: [
      { tok: "Interested", p: 0.45, allowed: false },
      { tok: "interested", p: 0.3, allowed: true },
      { tok: "maybe", p: 0.15, allowed: false },
      { tok: "not_interested", p: 0.07, allowed: true },
      { tok: "insufficient_evidence", p: 0.03, allowed: true },
    ],
    note: "Only enum values can follow. The model's favourite (“Interested”) is illegal, so the best legal token wins after renormalization.",
  },
  {
    prefix: '{"intent": "interested"',
    candidates: [
      { tok: "}", p: 0.5, allowed: true },
      { tok: ",", p: 0.35, allowed: true },
      { tok: " (very keen!)", p: 0.15, allowed: false },
    ],
    note: "Valid by construction — but notice constrained decoding cannot tell you whether “interested” is the RIGHT label.",
  },
];

export default function StructuredOutputLab() {
  const [schema, setSchema] = useState(SCHEMA);
  const [output, setOutput] = useState(EXPECTED);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [step, setStep] = useState(0);
  const v = useMemo(() => validateJson(schema, output), [schema, output]);

  const correct = Object.entries(answers).filter(([i, a]) => MALFORMED[Number(i)].problem === a).length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>JSON extraction lab</CardTitle>
            <p className="mt-1 font-mono text-xs text-muted-foreground">Input: “Customer wants a 5 lakh personal loan and asked about interest rate.”</p>
          </div>
          <ModeBadge mode="computed" detail="Validated with Ajv (a real JSON Schema validator)." />
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label>JSON Schema (required fields, optional fields, enums, types)</Label>
            <JsonEditor value={schema} onChange={setSchema} height="330px" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Model output (edit it — try breaking it)</Label>
              <Button size="sm" variant="ghost" onClick={() => setOutput(EXPECTED)}>
                <RotateCcw /> Reset
              </Button>
            </div>
            <JsonEditor value={output} onChange={setOutput} height="200px" />
            <div className={cn("rounded-lg border p-3 text-sm", v.valid ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft")}>
              <div className="flex items-center gap-2 font-semibold">
                {v.valid ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />}
                {v.valid ? "Valid against schema" : "Invalid"}
              </div>
              {v.schemaError && <div className="mt-1 text-xs">{v.schemaError}</div>}
              {v.parseError && <div className="mt-1 text-xs">JSON parse error: {v.parseError}</div>}
              {v.errors.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {v.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
              {v.valid && <div className="mt-1 text-xs text-muted-foreground">Valid ≠ correct. Is 500000 really what the customer said? Validation checks shape; evaluation checks truth.</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Spot the problem: deliberately malformed outputs</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Pick what's wrong with each output, then see the validator's verdict.</p>
          </div>
          <Badge variant="muted">
            {correct}/{MALFORMED.length} correct
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {MALFORMED.map((m, i) => {
            const a = answers[i];
            const res = validateJson(SCHEMA, m.output);
            return (
              <div key={i} className={cn("rounded-lg border p-3", a && (a === m.problem ? "border-success/40" : "border-danger/40"))}>
                <pre className="max-h-40 overflow-auto rounded bg-subtle p-2 font-mono text-[11px] whitespace-pre-wrap">{m.output}</pre>
                <div className="mt-2 flex flex-wrap gap-1">
                  {PROBLEMS.map((p) => (
                    <button
                      key={p}
                      disabled={!!a}
                      onClick={() => setAnswers((x) => ({ ...x, [i]: p }))}
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[11px]",
                        !a && "cursor-pointer hover:bg-muted",
                        a === p && (p === m.problem ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger"),
                        a && a !== p && p === m.problem && "border-success text-success",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {a && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div>
                      <span className="font-semibold">Validator: </span>
                      {res.parseError ? `JSON.parse failed — ${res.parseError}` : res.valid ? "passes schema validation ✓ (!)" : res.errors.join("; ")}
                    </div>
                    <div className="text-muted-foreground">{m.lesson}</div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>How constrained decoding works</CardTitle>
          <ModeBadge mode="precomputed" detail="Illustrative next-token probabilities; the masking logic is how grammar-constrained decoding works." />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-subtle p-3 font-mono text-sm">
            <span className="text-muted-foreground">output so far: </span>
            {STEPS[step].prefix || <span className="text-muted-foreground">(empty)</span>}
            <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
          </div>
          <div className="space-y-1.5">
            {STEPS[step].candidates.map((c) => {
              const allowedTotal = STEPS[step].candidates.filter((x) => x.allowed).reduce((s, x) => s + x.p, 0);
              const renorm = c.allowed ? c.p / allowedTotal : 0;
              return (
                <div key={c.tok} className="grid grid-cols-[140px_1fr_110px] items-center gap-2 text-sm">
                  <span className={cn("truncate font-mono text-xs", !c.allowed && "text-muted-foreground line-through")}>{c.tok}</span>
                  <div className="relative h-4 rounded bg-muted">
                    <div className="absolute inset-y-0 left-0 rounded bg-muted-foreground/30" style={{ width: `${c.p * 100}%` }} />
                    {c.allowed && <div className="absolute inset-y-0 left-0 rounded bg-primary/70" style={{ width: `${renorm * 100}%` }} />}
                  </div>
                  <span className="font-mono text-xs">
                    {c.p.toFixed(2)} → {c.allowed ? renorm.toFixed(2) : <span className="text-danger">masked</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">{STEPS[step].note}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Back
            </Button>
            <Button size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}>
              Next token <ChevronRight />
            </Button>
          </div>
          <Callout tone="info">
            Grey bar = the model's raw probability. Teal bar = probability after masking illegal tokens and renormalizing. Without constraints the model's first token would most likely be “Sure” — the classic chatty-wrapper failure.
          </Callout>
        </CardContent>
      </Card>
    </div>
  );
}
