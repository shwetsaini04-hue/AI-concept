"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Textarea, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { TranscriptViewer } from "@/components/shared/TranscriptViewer";
import type { Turn } from "@/content/types";
import { DATASET } from "@/content/dataset";
import { cn } from "@/lib/utils";

type Verdict = "Supported" | "Contradicted" | "Insufficient evidence";
const VERDICTS: Verdict[] = ["Supported", "Contradicted", "Insufficient evidence"];

interface Item {
  transcript: Turn[];
  claim: string;
  verdict: Verdict;
  evidence: number[];
  why: string;
}

const conv = (id: string): Turn[] => DATASET.find((c) => c.id === id)!.turns.map((t) => ({ speaker: t.speaker, text: t.text }));

const ITEMS: Item[] = [
  {
    transcript: [
      { speaker: "Customer", text: "I might consider a loan next month." },
      { speaker: "Agent", text: "So you want a loan?" },
      { speaker: "Customer", text: "I said I might consider it." },
    ],
    claim: "The customer is definitely interested in taking a loan.",
    verdict: "Insufficient evidence",
    evidence: [0, 2],
    why: "“Might consider … next month” is hedged, future and conditional. The agent's paraphrase (turn 2) is not customer evidence — and the customer explicitly corrects it. Nothing rules interest out, so it's not Contradicted; nothing commits to it, so it's not Supported.",
  },
  {
    transcript: conv("c03"),
    claim: "The customer was offered a rate of 10.5%.",
    verdict: "Contradicted",
    evidence: [2, 3],
    why: "The agent offered 14% (turn 3). 10.5% is the competitor's rate the customer mentions (turn 4). Note: for a claim about what the AGENT offered, agent speech is valid evidence.",
  },
  {
    transcript: conv("c05"),
    claim: "The customer is self-employed.",
    verdict: "Supported",
    evidence: [5],
    why: "“apna business hai, kapde ka” — the customer runs their own (garment) business, which entails self-employment.",
  },
  {
    transcript: conv("c08"),
    claim: "The customer rejected the loan because the EMI was too high.",
    verdict: "Contradicted",
    evidence: [3, 5],
    why: "The customer objected (“to much hai yaar”) but then accepted the 5-year tenure and asked about the process. The final stance contradicts ‘rejected’. Citing only turn 4 is the classic cherry-picking error.",
  },
  {
    transcript: conv("c13"),
    claim: "The customer asked to be called back in the evening.",
    verdict: "Supported",
    evidence: [1],
    why: "“shaam ko 6 baje call karo” — call at 6 in the evening.",
  },
  {
    transcript: conv("c06"),
    claim: "The customer wants a personal loan.",
    verdict: "Contradicted",
    evidence: [3],
    why: "“mujhe nahi chahiye” — the customer does not want it for themselves. A possible interest from the brother is a different entity.",
  },
  {
    transcript: conv("c10"),
    claim: "The customer's top-up was approved for 5 lakh.",
    verdict: "Contradicted",
    evidence: [2],
    why: "The agent says the customer is eligible for up to 2 lakh. 5 lakh contradicts that (and 'approved' was never said) — a numerical hallucination if a model produced it.",
  },
  {
    transcript: conv("c11"),
    claim: "The customer is not eligible for any loan.",
    verdict: "Insufficient evidence",
    evidence: [2],
    why: "The agent says it's difficult now but possible with a co-applicant. 'Not eligible for any loan' overstates what was said.",
  },
];

interface State {
  sel: number[];
  verdict: Verdict | "";
  reasoning: string;
  checked: boolean;
}

export default function GroundingLab() {
  const [i, setI] = useState(0);
  const [st, setSt] = useState<State[]>(ITEMS.map(() => ({ sel: [], verdict: "", reasoning: "", checked: false })));
  const item = ITEMS[i];
  const s = st[i];
  const update = (p: Partial<State>) => setSt((x) => x.map((y, j) => (j === i ? { ...y, ...p } : y)));

  const verdictOk = s.verdict === item.verdict;
  const hit = s.sel.filter((t) => item.evidence.includes(t)).length;
  const evidenceOk = hit > 0 && hit / Math.max(1, s.sel.length) >= 0.5;
  const score = st.filter((x, j) => x.checked && x.verdict === ITEMS[j].verdict).length;
  const done = st.filter((x) => x.checked).length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Answer + Evidence + Reasoning</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Is the claim supported by the transcript? Select evidence turns, pick a verdict, justify it.</p>
          </div>
          <div className="flex items-center gap-2">
            <ModeBadge mode="precomputed" detail="Reference verdicts and evidence were hand-annotated." />
            <Badge variant="muted">
              verdicts correct: {score}/{done || 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
              <ChevronLeft /> Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              Claim {i + 1} of {ITEMS.length}
            </span>
            <Button size="sm" variant="outline" onClick={() => setI((x) => Math.min(ITEMS.length - 1, x + 1))} disabled={i === ITEMS.length - 1}>
              Next <ChevronRight />
            </Button>
          </div>
          <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary-soft px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Claim to verify</div>
            <div className="font-medium">{item.claim}</div>
          </div>
          <div className="text-xs text-muted-foreground">1 · Click the turns that are your evidence</div>
          <TranscriptViewer
            turns={item.transcript}
            selectable={!s.checked}
            selected={s.sel}
            onToggle={(t) => update({ sel: s.sel.includes(t) ? s.sel.filter((x) => x !== t) : [...s.sel, t] })}
            highlight={s.checked ? item.evidence : []}
          />
          <div className="text-xs text-muted-foreground">2 · Verdict</div>
          <div className="flex flex-wrap gap-2">
            {VERDICTS.map((v) => (
              <button
                key={v}
                disabled={s.checked}
                onClick={() => update({ verdict: v })}
                className={cn("rounded-md border px-3 py-1.5 text-sm", !s.checked && "cursor-pointer hover:bg-muted", s.verdict === v && "border-primary bg-primary-soft text-primary")}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">3 · Reasoning (one or two sentences)</div>
          <Textarea rows={2} value={s.reasoning} disabled={s.checked} onChange={(e) => update({ reasoning: e.target.value })} placeholder="Why does the evidence support / contradict / not settle the claim?" />
          <div className="flex gap-2">
            <Button onClick={() => update({ checked: true })} disabled={!s.verdict || !s.sel.length || s.checked}>
              Check
            </Button>
            {s.checked && (
              <Button variant="ghost" onClick={() => update({ checked: false, sel: [], verdict: "", reasoning: "" })}>
                Retry
              </Button>
            )}
          </div>

          {s.checked && (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className={cn("rounded-lg border p-3 text-sm", verdictOk && evidenceOk ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft")}>
                <div className="flex items-center gap-2 font-semibold">
                  {verdictOk ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />} Verdict {verdictOk ? "correct" : `— reference: ${item.verdict}`}
                </div>
                <div className="mt-1 flex items-center gap-2 font-semibold">
                  {evidenceOk ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />} Evidence {evidenceOk ? "overlaps the reference" : `— reference turns: ${item.evidence.map((t) => t + 1).join(", ")}`}
                </div>
                <p className="mt-2">{item.why}</p>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Your output as a structured, auditable record</div>
                <pre className="overflow-auto rounded-lg border bg-subtle p-3 font-mono text-[11px]">
                  {JSON.stringify(
                    {
                      claim: item.claim,
                      verdict: s.verdict,
                      evidence: s.sel
                        .slice()
                        .sort((a, b) => a - b)
                        .map((t) => ({ turn: t + 1, speaker: item.transcript[t].speaker, quote: item.transcript[t].text })),
                      reasoning: s.reasoning || "(empty — a verdict without reasoning can't be audited)",
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Callout tone="info" title="Three verdicts, not two">
        <b>Supported</b> (entailed): the evidence implies the claim. <b>Contradicted</b>: the evidence implies the claim is false. <b>Insufficient evidence</b> (neutral): the transcript doesn't settle it.
        Collapsing the last two into “false” is the most common grounding mistake — it turns “we don't know” into a confident negative.
      </Callout>
    </div>
  );
}
