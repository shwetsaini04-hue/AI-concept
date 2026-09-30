"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { TranscriptViewer } from "@/components/shared/TranscriptViewer";
import { DATASET } from "@/content/dataset";
import type { Turn } from "@/content/types";
import { cn } from "@/lib/utils";

const VERDICTS = ["Supported", "Unsupported", "Contradicted", "Insufficient Evidence"] as const;
const CATEGORIES = ["None (faithful)", "Fabricated entity", "Unsupported claim", "Incorrect inference", "Missing evidence", "Contradiction", "Numerical hallucination"] as const;
type V = (typeof VERDICTS)[number];
type C = (typeof CATEGORIES)[number];

const conv = (id: string): Turn[] => DATASET.find((c) => c.id === id)!.turns.map((t) => ({ speaker: t.speaker, text: t.text }));

const ITEMS: { convId: string; answer: string; verdict: V; category: C; evidence: number[]; why: string }[] = [
  { convId: "c01", answer: "Customer wants a personal loan of about 5 lakh for 3 years and plans to apply by tomorrow.", verdict: "Supported", category: "None (faithful)", evidence: [1, 3, 7, 9], why: "Every element is in the customer's own words: personal lon, five lac, 3 saal, kal tak apply." },
  { convId: "c07", answer: "The customer works at Infosys in Pune and wants a car loan.", verdict: "Unsupported", category: "Fabricated entity", evidence: [5], why: "The customer said “an IT company in Pune”. “Infosys” was invented — plausible, specific and unsupported." },
  { convId: "c05", answer: "The customer needs a home loan of 5 crore for a flat in Noida.", verdict: "Contradicted", category: "Numerical hallucination", evidence: [3], why: "50 lakh = 5,000,000 INR = 0.5 crore. Unit confusion in Indian numbering (lakh/crore) is a very common numerical hallucination." },
  { convId: "c02", answer: "The customer will apply for a loan next month.", verdict: "Insufficient Evidence", category: "Incorrect inference", evidence: [1, 3], why: "“Might consider” ≠ “will apply”. The ingredients are in the transcript; the conclusion is stronger than the evidence." },
  { convId: "c08", answer: "The customer rejected the offer because the EMI was too high.", verdict: "Contradicted", category: "Contradiction", evidence: [3, 5], why: "The objection was resolved: “haan fir theek hai 5 saal kar do”." },
  { convId: "c09", answer: "The customer said they already have a loan from another bank and asked to be removed from the list.", verdict: "Unsupported", category: "Unsupported claim", evidence: [1], why: "The removal request is real; the existing loan from another bank is never mentioned." },
  { convId: "c13", answer: "The customer is interested and asked for a callback at 6 pm.", verdict: "Insufficient Evidence", category: "Incorrect inference", evidence: [1], why: "The callback request is supported; ‘interested’ is inferred from politeness. Callback ≠ interest." },
  { convId: "c10", answer: "Existing personal-loan customer asking for a top-up; agent says eligible up to 2 lakh; customer also asked about a credit card.", verdict: "Supported", category: "None (faithful)", evidence: [1, 2, 3], why: "All three facts are stated." },
  { convId: "c04", answer: "Customer confirmed they want a 5 lakh loan (evidence: “sir you want 5 lakh loan right”).", verdict: "Unsupported", category: "Missing evidence", evidence: [0, 1, 3], why: "The cited ‘evidence’ is the agent's leading question. The customer's own words (“dekhte hai”, “abhi mat karo”) don't support the claim." },
  { convId: "c14", answer: "The customer said “zaroor lunga”, so they will definitely take the loan.", verdict: "Contradicted", category: "Contradiction", evidence: [1, 3], why: "Sarcasm, then: “mazaak kar raha tha, itna mehenga kaun lega” — an explicit refusal." },
  { convId: "c06", answer: "The customer's brother Rohit needs a 3 lakh personal loan.", verdict: "Unsupported", category: "Fabricated entity", evidence: [3, 5], why: "No name and no amount were given for the brother. Both ‘Rohit’ and ‘3 lakh’ are fabricated." },
];

export default function HallucinationLab() {
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<{ v?: V; c?: C; revealed?: boolean }[]>(ITEMS.map(() => ({})));
  const it = ITEMS[i];
  const a = ans[i];
  const set = (p: Partial<(typeof ans)[number]>) => setAns((x) => x.map((y, j) => (j === i ? { ...y, ...p } : y)));
  const vScore = ans.filter((x, j) => x.revealed && x.v === ITEMS[j].verdict).length;
  const cScore = ans.filter((x, j) => x.revealed && x.c === ITEMS[j].category).length;
  const done = ans.filter((x) => x.revealed).length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Is this answer supported by the transcript?</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Read the transcript, judge the model answer, classify the hallucination type, then reveal the evidence.</p>
          </div>
          <div className="flex items-center gap-2">
            <ModeBadge mode="precomputed" detail="Model answers are hand-written examples of each hallucination category." />
            <Badge variant="muted">verdict {vScore}/{done} · type {cScore}/{done}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
              <ChevronLeft /> Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              {i + 1} / {ITEMS.length}
            </span>
            <Button size="sm" variant="outline" onClick={() => setI((x) => Math.min(ITEMS.length - 1, x + 1))} disabled={i === ITEMS.length - 1}>
              Next <ChevronRight />
            </Button>
          </div>
          <TranscriptViewer turns={conv(it.convId)} highlight={a.revealed ? it.evidence : []} highlightTone={it.verdict === "Supported" ? "success" : "warning"} />
          <div className="rounded-lg border-2 border-dashed border-info/40 bg-info-soft px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-info">Model answer</div>
            <div className="font-medium">{it.answer}</div>
          </div>
          <div>
            <div className="mb-1.5 text-xs text-muted-foreground">Verdict</div>
            <div className="flex flex-wrap gap-2">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  disabled={a.revealed}
                  onClick={() => set({ v })}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm",
                    !a.revealed && "cursor-pointer hover:bg-muted",
                    a.v === v && !a.revealed && "border-primary bg-primary-soft text-primary",
                    a.revealed && v === it.verdict && "border-success bg-success-soft text-success",
                    a.revealed && a.v === v && v !== it.verdict && "border-danger bg-danger-soft text-danger",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs text-muted-foreground">Hallucination type</div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  disabled={a.revealed}
                  onClick={() => set({ c })}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs",
                    !a.revealed && "cursor-pointer hover:bg-muted",
                    a.c === c && !a.revealed && "border-primary bg-primary-soft text-primary",
                    a.revealed && c === it.category && "border-success bg-success-soft text-success",
                    a.revealed && a.c === c && c !== it.category && "border-danger bg-danger-soft text-danger",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => set({ revealed: true })} disabled={!a.v || !a.c || a.revealed}>
              Reveal evidence
            </Button>
            {a.revealed && (
              <Button variant="ghost" onClick={() => set({ revealed: false, v: undefined, c: undefined })}>
                Retry
              </Button>
            )}
          </div>
          {a.revealed && (
            <div className={cn("rounded-lg border p-3 text-sm", a.v === it.verdict ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft")}>
              <div className="flex items-center gap-2 font-semibold">
                {a.v === it.verdict ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />}
                {it.verdict} · {it.category}
              </div>
              <p className="mt-1">{it.why}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <Callout tone="info" title="Why categorize?">
        Different hallucination types need different defences: fabricated entities → require quotes and check they exist; numerical → extract spans and normalize numbers in code; incorrect inference → an explicit
        “insufficient evidence” option and entailment verification; missing evidence → check the speaker of every cited quote.
      </Callout>
    </div>
  );
}
