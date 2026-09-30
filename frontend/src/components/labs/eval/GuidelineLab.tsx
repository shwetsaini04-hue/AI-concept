"use client";

import { useMemo } from "react";
import { Plus, Trash2, Download, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea, Callout, ProgressBar } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { useLabState } from "@/lib/store/progress";
import { cn, pct } from "@/lib/utils";

interface LabelDef {
  name: string;
  definition: string;
  include: string;
  exclude: string;
  positive: string;
  negative: string;
  borderline: string;
}

interface Codebook {
  labels: LabelDef[];
  edgeCases: { situation: string; ruling: string }[];
  escalation: string;
}

const STARTER: Codebook = {
  labels: [
    {
      name: "INTERESTED",
      definition: "Customer explicitly expresses willingness to pursue the product.",
      include: "Asks to apply, asks for the link/documents in order to proceed, agrees to an offer.",
      exclude: "Politeness ('ok', 'haan') without commitment; agent paraphrases.",
      positive: "I want to apply. / haan bhej do, main apply kar dunga",
      negative: "I don't need a loan.",
      borderline: "Maybe someday.",
    },
    { name: "NOT_INTERESTED", definition: "", include: "", exclude: "", positive: "", negative: "", borderline: "" },
  ],
  edgeCases: [],
  escalation: "",
};

const EDGE_TESTS: { utterance: string; category: string; keywords: string[] }[] = [
  { utterance: "I might consider it next month.", category: "Conditional / future interest", keywords: ["maybe", "might", "later", "next month", "future", "conditional", "someday"] },
  { utterance: "Agent: so you want 5 lakh, right? — Customer: hmm", category: "Agent puts words in customer's mouth", keywords: ["agent", "paraphrase", "leading", "customer's own", "only customer", "own words"] },
  { utterance: "EMI too high… ok fine, 5 years, process it.", category: "Objection later resolved", keywords: ["objection", "resolved", "final", "later accept", "changes mind", "last"] },
  { utterance: "I don't need it, but my brother might.", category: "Third-party interest", keywords: ["third party", "third-party", "relative", "brother", "someone else", "on behalf", "referral", "family"] },
  { utterance: "Wow 18%, amazing offer, I'll definitely take it… (joking)", category: "Sarcasm", keywords: ["sarcas", "joke", "joking", "ironic", "irony", "mazaak"] },
  { utterance: "Wrong number.", category: "Wrong party reached", keywords: ["wrong number", "wrong person", "wrong party", "not reachable", "not contactable", "not the customer"] },
  { utterance: "Stop calling me, remove my number.", category: "Do-not-call request", keywords: ["do not call", "dnd", "remove", "compliance", "stop calling"] },
  { utterance: "I already have your PL, can I get a top-up?", category: "Existing product / top-up", keywords: ["existing", "top-up", "top up", "already has", "current customer", "cross-sell"] },
];

function lintLabel(l: LabelDef) {
  return [
    { ok: l.definition.trim().split(/\s+/).filter(Boolean).length >= 6, text: "Definition of ≥ 6 words" },
    { ok: l.include.trim().length > 5, text: "Inclusion criteria" },
    { ok: l.exclude.trim().length > 5, text: "Exclusion criteria" },
    { ok: l.positive.trim().length > 3, text: "Positive example" },
    { ok: l.negative.trim().length > 3, text: "Negative example" },
    { ok: l.borderline.trim().length > 3, text: "Borderline / insufficient example" },
  ];
}

function toMarkdown(cb: Codebook) {
  const parts = ["# Annotation codebook", ""];
  for (const l of cb.labels) {
    parts.push(`## ${l.name}`, "", `**Definition:** ${l.definition}`, "", `**Include:** ${l.include}`, "", `**Exclude:** ${l.exclude}`, "", `**Positive:** ${l.positive}`, "", `**Negative:** ${l.negative}`, "", `**Borderline:** ${l.borderline}`, "");
  }
  if (cb.edgeCases.length) {
    parts.push("## Edge-case rulings", "");
    cb.edgeCases.forEach((e) => parts.push(`- **${e.situation}** → ${e.ruling}`));
    parts.push("");
  }
  parts.push("## Escalation", "", cb.escalation || "(none)");
  return parts.join("\n");
}

export default function GuidelineLab() {
  const [cb, setCb] = useLabState<Codebook>("codebook", STARTER);
  const allText = useMemo(() => JSON.stringify(cb).toLowerCase(), [cb]);

  const hasAbstain = cb.labels.some((l) => /insufficient|unclear|unknown|abstain|not enough/i.test(l.name + l.definition));
  const coverage = EDGE_TESTS.map((t) => ({ ...t, covered: t.keywords.some((k) => allText.includes(k)) }));
  const covered = coverage.filter((c) => c.covered).length;
  // Simulated annotator pair: agree with p=0.92 on covered cases, 0.55 otherwise; κ estimated vs 3-class chance ≈ 0.36.
  const expectedAgreement = coverage.reduce((a, c) => a + (c.covered ? 0.92 : 0.55), 0) / coverage.length;
  const chance = 0.36;
  const estKappa = (expectedAgreement - chance) / (1 - chance);
  const labelChecks = cb.labels.map(lintLabel);
  const completeness = labelChecks.flat().filter((c) => c.ok).length / Math.max(1, labelChecks.flat().length);

  const update = (i: number, p: Partial<LabelDef>) => setCb({ ...cb, labels: cb.labels.map((l, j) => (j === i ? { ...l, ...p } : l)) });

  function download() {
    const blob = new Blob([toMarkdown(cb)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codebook.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {cb.labels.map((l, i) => {
            const checks = labelChecks[i];
            return (
              <Card key={i}>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <Input value={l.name} onChange={(e) => update(i, { name: e.target.value.toUpperCase() })} className="max-w-xs font-mono font-semibold" aria-label="Label name" />
                  <div className="flex items-center gap-2">
                    <Badge variant={checks.every((c) => c.ok) ? "success" : "warning"}>
                      {checks.filter((c) => c.ok).length}/{checks.length}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => setCb({ ...cb, labels: cb.labels.filter((_, j) => j !== i) })} aria-label="Delete label">
                      <Trash2 />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <Field label="Definition" value={l.definition} onChange={(v) => update(i, { definition: v })} wide />
                  <Field label="Inclusion criteria" value={l.include} onChange={(v) => update(i, { include: v })} />
                  <Field label="Exclusion criteria" value={l.exclude} onChange={(v) => update(i, { exclude: v })} />
                  <Field label="Positive example" value={l.positive} onChange={(v) => update(i, { positive: v })} />
                  <Field label="Negative example" value={l.negative} onChange={(v) => update(i, { negative: v })} />
                  <Field label="Borderline / insufficient example" value={l.borderline} onChange={(v) => update(i, { borderline: v })} wide />
                  <div className="flex flex-wrap gap-1.5 md:col-span-2">
                    {checks.map((c) => (
                      <span key={c.text} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]", c.ok ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                        {c.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {c.text}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Button variant="outline" onClick={() => setCb({ ...cb, labels: [...cb.labels, { name: "NEW_LABEL", definition: "", include: "", exclude: "", positive: "", negative: "", borderline: "" }] })}>
            <Plus /> Add label
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Edge-case rulings</CardTitle>
              <p className="text-sm text-muted-foreground">Situations annotators will disagree on unless you decide in advance.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {cb.edgeCases.map((ec, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <Input placeholder="Situation (e.g. customer's brother wants the loan)" value={ec.situation} onChange={(e) => setCb({ ...cb, edgeCases: cb.edgeCases.map((x, j) => (j === i ? { ...x, situation: e.target.value } : x)) })} />
                  <Input placeholder="Ruling (e.g. NOT_INTERESTED + referral flag)" value={ec.ruling} onChange={(e) => setCb({ ...cb, edgeCases: cb.edgeCases.map((x, j) => (j === i ? { ...x, ruling: e.target.value } : x)) })} />
                  <Button size="icon" variant="ghost" onClick={() => setCb({ ...cb, edgeCases: cb.edgeCases.filter((_, j) => j !== i) })} aria-label="Remove">
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setCb({ ...cb, edgeCases: [...cb.edgeCases, { situation: "", ruling: "" }] })}>
                <Plus /> Add edge case
              </Button>
              <div className="space-y-1 pt-2">
                <Label>Escalation rules</Label>
                <Textarea rows={2} value={cb.escalation} onChange={(e) => setCb({ ...cb, escalation: e.target.value })} placeholder="e.g. If two annotators disagree, or the call contains a do-not-call request, send to the senior reviewer…" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Codebook review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Label completeness</span>
                  <span className="font-mono">{pct(completeness)}</span>
                </div>
                <ProgressBar value={completeness} />
              </div>
              <Check ok={hasAbstain} text={hasAbstain ? "Has an insufficient-evidence label" : "No insufficient-evidence label — annotators will be forced to guess"} />
              <Check ok={cb.escalation.trim().length > 10} text="Escalation rule defined" />
              <Check ok={cb.edgeCases.filter((e) => e.situation && e.ruling).length >= 3} text="≥ 3 edge-case rulings" />
              <Button size="sm" variant="outline" onClick={download} className="w-full">
                <Download /> Download codebook.md
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle>Edge-case stress test</CardTitle>
              <ModeBadge mode="simulated" detail="Covered = your codebook text mentions the situation. Two simulated annotators agree 92% of the time on covered cases, 55% otherwise." />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {coverage.map((c) => (
                <div key={c.category} className="flex items-start gap-2">
                  {c.covered ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}
                  <div>
                    <div className="font-medium">{c.category}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{c.utterance}</div>
                  </div>
                </div>
              ))}
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">
                  Covered {covered}/{coverage.length} → estimated agreement on these cases
                </div>
                <div className="text-lg font-semibold">
                  {pct(expectedAgreement)} · κ ≈ {estKappa.toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Callout tone="info">
        A good codebook lets two people who have never met produce the same labels. Every uncovered edge case becomes disagreement, and disagreement becomes an invisible ceiling on every metric you report.
      </Callout>
    </div>
  );
}

function Field({ label, value, onChange, wide }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean }) {
  return (
    <div className={cn("space-y-1", wide && "md:col-span-2")}>
      <Label>{label}</Label>
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" />
    </div>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}
      <span>{text}</span>
    </div>
  );
}
