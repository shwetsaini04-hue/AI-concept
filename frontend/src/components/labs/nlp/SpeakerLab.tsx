"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, X, RotateCcw } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { SpeakerTag } from "@/components/shared/TranscriptViewer";
import type { Speaker } from "@/content/types";
import { cn, pct } from "@/lib/utils";

/* ---------------- Part 1: who said it? ---------------- */

const LINES: { text: string; answer: Speaker }[] = [
  { text: "Yes sir.", answer: "Customer" },
  { text: "Okay, how much are you looking for?", answer: "Agent" },
  { text: "Five lakh.", answer: "Customer" },
  { text: "Are you salaried?", answer: "Agent" },
  { text: "Yes.", answer: "Customer" },
  { text: "main Sunrise Bank se bol rahi hu", answer: "Agent" },
  { text: "mujhe EMI kam chahiye", answer: "Customer" },
  { text: "sir processing fee waive ho jayegi", answer: "Agent" },
  { text: "documents kya kya lagenge?", answer: "Customer" },
  { text: "ji sir, aapka pre-approved offer hai", answer: "Agent" },
];

interface Feature {
  name: string;
  re: RegExp;
  weight: number; // + → Agent, − → Customer
}

const FEATURES: Feature[] = [
  { name: "Qualification question (how much / salaried / kitna / aap…ho)", re: /\b(how much|are you|kitna|kitne|aap .*ho\b|salaried)\b/i, weight: 1.6 },
  { name: "Question mark", re: /\?/, weight: 0.6 },
  { name: "Company self-reference (bank se / calling from)", re: /\b(bank se|calling from|bol rahi|bol raha)\b/i, weight: 2.2 },
  { name: "Sales-script vocabulary (offer / pre-approved / processing fee / waive)", re: /\b(offer|pre-approved|pre approved|processing fee|waive|application)\b/i, weight: 1.8 },
  { name: "Addresses the other party as 'sir' (both sides do this in India)", re: /\bsir\b/i, weight: 0.3 },
  { name: "First-person need (mujhe / I need / I want / chahiye)", re: /\b(mujhe|i need|i want|chahiye)\b/i, weight: -1.8 },
  { name: "Asks about requirements (documents / EMI / rate kitna)", re: /\b(documents|lagenge|emi)\b/i, weight: -0.9 },
  { name: "Short answer / acknowledgement (yes / haan / a number)", re: /^\s*(yes|no|haan|ha|nahi|ok|okay)?\s*(sir)?[.!]?\s*$|^\s*(five|ten|\d+)\s+(lakh|lac)\.?\s*$/i, weight: -1.4 },
];

function scoreLine(text: string) {
  const hits = FEATURES.filter((f) => f.re.test(text));
  const z = hits.reduce((a, f) => a + f.weight, 0);
  const pAgent = 1 / (1 + Math.exp(-z));
  return { hits, pAgent, guess: (pAgent >= 0.5 ? "Agent" : "Customer") as Speaker };
}

/* ---------------- Part 2: error propagation ---------------- */

interface PTurn {
  truth: Speaker;
  diarized: Speaker;
  text: string;
}

const PROP_TURNS: PTurn[] = [
  { truth: "Agent", diarized: "Agent", text: "namaste sir, Sunrise Bank se call hai" },
  { truth: "Agent", diarized: "Customer", text: "sir aapko 5 lakh ka personal loan chahiye, right?" },
  { truth: "Customer", diarized: "Customer", text: "hmm" },
  { truth: "Agent", diarized: "Agent", text: "main details bhej deta hu" },
  { truth: "Customer", diarized: "Customer", text: "ok" },
];

const INTEREST = /\b(want|need|chahiye|apply|interested|process kar do)\b/i;
const AMOUNT = /\b\d+\s*(lakh|lac)\b/i;
const HESITATE = /\b(dekhte|maybe|might|shayad|baad mein|mat karo)\b/i;
const REFUSE = /\b(nahi chahiye|not interested|rehne do)\b/i;

function downstream(turns: { speaker: Speaker; text: string }[]) {
  const cust = turns.map((t, i) => ({ ...t, i })).filter((t) => t.speaker === "Customer");
  const evidence = cust.filter((t) => INTEREST.test(t.text) && !REFUSE.test(t.text));
  const hes = cust.filter((t) => HESITATE.test(t.text));
  const ref = cust.filter((t) => REFUSE.test(t.text));
  let score = Math.min(1, evidence.length * 0.5) + (evidence.some((e) => AMOUNT.test(e.text)) ? 0.3 : 0) - hes.length * 0.4 - ref.length * 0.8;
  score = Math.max(-1, Math.min(1.2, score));
  const intent = score >= 0.5 ? "Interested" : score <= -0.4 ? "Not Interested" : "Insufficient Evidence";
  const confidence = Math.min(0.95, 0.5 + Math.abs(score) / 2);
  const amount = evidence.map((e) => e.text.match(AMOUNT)?.[0]).find(Boolean);
  const decision =
    intent === "Interested" && confidence >= 0.75
      ? `HOT LEAD → sales callback within 1 hour${amount ? `, application pre-filled for ${amount}` : ""}`
      : intent === "Interested"
        ? "Warm lead → follow-up in 2 days"
        : intent === "Not Interested"
          ? "Suppress outreach for 90 days"
          : "No sales action; keep in nurture list";
  return { evidence, intent, confidence, decision };
}

export default function SpeakerLab() {
  const [answers, setAnswers] = useState<(Speaker | "")[]>(LINES.map(() => ""));
  const [checked, setChecked] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>(PROP_TURNS.map((t) => t.diarized));

  const correct = answers.filter((a, i) => a === LINES[i].answer).length;
  const baseline = LINES.map((l) => scoreLine(l.text));
  const baselineAcc = baseline.filter((b, i) => b.guess === LINES[i].answer).length / LINES.length;

  const truthRun = useMemo(() => downstream(PROP_TURNS.map((t) => ({ speaker: t.truth, text: t.text }))), []);
  const run = useMemo(() => downstream(PROP_TURNS.map((t, i) => ({ speaker: speakers[i], text: t.text }))), [speakers]);
  const wrongSpeakers = speakers.filter((s, i) => s !== PROP_TURNS[i].truth).length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Speaker labels are missing — who said each line?</CardTitle>
          <ModeBadge mode="precomputed" />
        </CardHeader>
        <CardContent className="space-y-2">
          {LINES.map((l, i) => {
            const ok = answers[i] === l.answer;
            return (
              <div key={i} className={cn("rounded-md border p-2", checked && (ok ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft"))}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="flex-1 font-mono text-[13px]">“{l.text}”</span>
                  <div className="flex gap-1">
                    {(["Agent", "Customer"] as Speaker[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          const n = [...answers];
                          n[i] = s;
                          setAnswers(n);
                          setChecked(false);
                        }}
                        className={cn(
                          "cursor-pointer rounded-md border px-3 py-1 text-xs font-medium",
                          answers[i] === s ? (s === "Agent" ? "border-agent bg-agent-soft text-agent" : "border-customer bg-customer-soft text-customer") : "hover:bg-muted",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {checked && (ok ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />)}
                </div>
                {checked && (
                  <div className="mt-2 border-t pt-2 text-xs">
                    <span className="font-medium">Clues: </span>
                    {baseline[i].hits.length ? (
                      baseline[i].hits.map((h) => (
                        <span key={h.name} className={cn("mr-1.5 inline-block rounded px-1.5 py-0.5", h.weight > 0 ? "bg-agent-soft text-agent" : "bg-customer-soft text-customer")}>
                          {h.name} ({h.weight > 0 ? "+" : ""}
                          {h.weight})
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">no strong cue — genuinely ambiguous without context</span>
                    )}
                    <span className="ml-1 text-muted-foreground">
                      → baseline P(Agent) = {baseline[i].pAgent.toFixed(2)} (answer: {l.answer})
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={() => setChecked(true)} disabled={answers.some((a) => !a)}>
              Check & show clues
            </Button>
            {checked && (
              <>
                <Badge variant={correct >= 8 ? "success" : "warning"}>
                  You: {correct}/{LINES.length}
                </Badge>
                <Badge variant="muted">Rule-based cue baseline: {pct(baselineAcc)}</Badge>
              </>
            )}
          </div>
          {checked && (
            <p className="text-xs text-muted-foreground">
              The baseline is deterministic code that turns the linguistic clues into weights (see the chips). Notice lines like “Yes sir.” — both parties say “sir”, and a bare “Yes” has no role cue at all without its adjacent question.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Error propagation: one wrong speaker label → one wrong business decision</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Click a speaker tag to flip it. The downstream pipeline below re-runs instantly.</p>
          </div>
          <ModeBadge mode="simulated" detail="A transparent keyword pipeline stands in for NER/classifier/decision stages so you can see the cascade. Real LLM pipelines fail the same way." />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5 rounded-lg border bg-subtle p-3 font-mono text-[13px]">
            {PROP_TURNS.map((t, i) => {
              const wrong = speakers[i] !== t.truth;
              return (
                <div key={i} className={cn("flex items-center gap-2 rounded px-1 py-1", wrong && "bg-danger-soft ring-1 ring-danger")}>
                  <span className="w-4 text-right text-[11px] text-muted-foreground">{i + 1}</span>
                  <button
                    onClick={() => setSpeakers((s) => s.map((x, j) => (j === i ? (x === "Agent" ? "Customer" : "Agent") : x)))}
                    className="cursor-pointer"
                    title="Flip speaker"
                  >
                    <SpeakerTag speaker={speakers[i]} />
                  </button>
                  <span className="flex-1">{t.text}</span>
                  {wrong && <span className="text-[10px] text-danger">really: {t.truth}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setSpeakers(PROP_TURNS.map((t) => t.diarized))}>
              Use diarization output (1 error)
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSpeakers(PROP_TURNS.map((t) => t.truth))}>
              <RotateCcw /> Correct speakers
            </Button>
            <Badge variant={wrongSpeakers ? "danger" : "success"}>{wrongSpeakers} speaker error(s)</Badge>
          </div>

          <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
            <Stage title="Speaker attribution" changed={wrongSpeakers > 0}>
              {wrongSpeakers ? `${wrongSpeakers} agent turn(s) attributed to the customer` : "All turns correctly attributed"}
            </Stage>
            <Arrow />
            <Stage title="Evidence extraction" changed={run.evidence.length !== truthRun.evidence.length}>
              {run.evidence.length ? run.evidence.map((e) => <div key={e.i} className="font-mono text-xs">“{e.text}”</div>) : <span className="text-muted-foreground">No customer interest evidence</span>}
            </Stage>
            <Arrow />
            <Stage title="Intent classification" changed={run.intent !== truthRun.intent}>
              <div className="font-semibold">{run.intent}</div>
              <div className="text-xs text-muted-foreground">confidence {run.confidence.toFixed(2)}</div>
            </Stage>
            <Arrow />
            <Stage title="Business decision" changed={run.decision !== truthRun.decision}>
              {run.decision}
            </Stage>
          </div>
          {wrongSpeakers > 0 && run.intent !== truthRun.intent && (
            <Callout tone="danger" title="The whole chain is confidently wrong">
              With correct speakers the system says <b>{truthRun.intent}</b> → “{truthRun.decision}”. One diarization error made the agent's leading question look like the customer's own words,
              producing a high-confidence false lead. Nothing downstream can detect this unless evidence is checked against speaker labels — which is why speaker attribution gets its own evaluation.
            </Callout>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stage({ title, changed, children }: { title: string; changed: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border p-3 text-sm", changed ? "border-danger/50 bg-danger-soft" : "border-success/30 bg-success-soft")}>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        {changed && <span className="text-danger">changed</span>}
      </div>
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-muted-foreground">
      <ArrowRight className="h-4 w-4 rotate-90 lg:rotate-0" />
    </div>
  );
}
