"use client";

import { useMemo, useState } from "react";
import { ArrowDown, Check, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { SpeakerTag } from "@/components/shared/TranscriptViewer";
import { DATASET, DIALOGUE_ACTS, type DatasetTurn, type DialogueAct } from "@/content/dataset";
import { cn, pct } from "@/lib/utils";

const SPEC_CONV: { id: string; title: string; turns: DatasetTurn[] } = {
  id: "spec",
  title: "Loan enquiry (warm-up)",
  turns: [
    { speaker: "Agent", text: "Hello sir, how can I help you?", act: "Greeting", segment: "Opening" },
    { speaker: "Customer", text: "Mujhe loan ke regarding jaana tha.", act: "Request", segment: "Discovery" },
    { speaker: "Agent", text: "Sure sir. How much loan are you looking for?", act: "Question", segment: "Discovery" },
    { speaker: "Customer", text: "Around 5 lakh.", act: "Answer", segment: "Discovery" },
    { speaker: "Agent", text: "Okay sir. Are you currently employed?", act: "Question", segment: "Qualification" },
    { speaker: "Customer", text: "Yes.", act: "Answer", segment: "Qualification" },
  ],
};

const CONVS = [SPEC_CONV, ...DATASET.filter((c) => ["c01", "c03", "c05", "c08", "c14"].includes(c.id)).map((c) => ({ id: c.id, title: c.title, turns: c.turns }))];

const ACT_COLOR: Record<DialogueAct, string> = {
  Greeting: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  Question: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100",
  Answer: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  Inform: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  Confirmation: "bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-100",
  Request: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  Clarification: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100",
  Objection: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100",
  Refusal: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100",
  Closing: "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
};

const FIRST_PART: DialogueAct[] = ["Question", "Request", "Clarification", "Greeting"];
const SECOND_PART: DialogueAct[] = ["Answer", "Confirmation", "Refusal", "Clarification", "Greeting", "Request"];

function adjacencyPairs(turns: DatasetTurn[], acts: (DialogueAct | "")[]) {
  const pairs: [number, number][] = [];
  const used = new Set<number>();
  acts.forEach((a, i) => {
    if (!a || !FIRST_PART.includes(a)) return;
    for (let j = i + 1; j < Math.min(turns.length, i + 3); j++) {
      const b = acts[j];
      if (turns[j].speaker !== turns[i].speaker && b && SECOND_PART.includes(b) && !used.has(j)) {
        pairs.push([i, j]);
        used.add(j);
        break;
      }
    }
  });
  return pairs;
}

export default function DialogueLab() {
  const [convId, setConvId] = useState(CONVS[0].id);
  const conv = CONVS.find((c) => c.id === convId)!;
  const [labels, setLabels] = useState<Record<string, (DialogueAct | "")[]>>({});
  const [checked, setChecked] = useState(false);
  const [showGold, setShowGold] = useState(false);

  const mine = labels[convId] ?? conv.turns.map(() => "" as const);
  const acts = showGold ? conv.turns.map((t) => t.act) : mine;
  const allLabelled = mine.every(Boolean);
  const agreement = mine.filter((a, i) => a === conv.turns[i].act).length / conv.turns.length;
  const pairs = useMemo(() => adjacencyPairs(conv.turns, acts), [conv, acts]);

  const setLabel = (i: number, a: DialogueAct | "") => {
    const next = [...mine];
    next[i] = a;
    setLabels((l) => ({ ...l, [convId]: next }));
    setChecked(false);
  };

  // segment bands (gold segmentation)
  const segments: { name: string; start: number; end: number }[] = [];
  conv.turns.forEach((t, i) => {
    const last = segments.at(-1);
    if (last && last.name === t.segment) last.end = i;
    else segments.push({ name: t.segment, start: i, end: i });
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Label each utterance with its dialogue act</CardTitle>
          <div className="flex items-center gap-2">
            <ModeBadge mode="precomputed" detail="Reference labels were hand-annotated for this synthetic dataset." />
            <Select
              value={convId}
              onChange={(e) => {
                setConvId(e.target.value);
                setChecked(false);
                setShowGold(false);
              }}
              aria-label="Conversation"
            >
              {CONVS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {conv.turns.map((t, i) => {
            const ok = mine[i] === t.act;
            return (
              <div key={i} className={cn("flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center", checked && (ok ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft"))}>
                <span className="w-5 text-right font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                <SpeakerTag speaker={t.speaker} />
                <span className="flex-1 font-mono text-[13px]">{t.text}</span>
                <Select value={mine[i]} onChange={(e) => setLabel(i, e.target.value as DialogueAct)} className="sm:w-40" aria-label={`Dialogue act for turn ${i + 1}`}>
                  <option value="">Choose act…</option>
                  {DIALOGUE_ACTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
                {checked && !ok && <span className="text-xs text-danger sm:w-28">ref: {t.act}</span>}
                {checked && ok && <Check className="h-4 w-4 text-success" />}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={() => setChecked(true)} disabled={!allLabelled}>
              Check my labels
            </Button>
            <Button variant="outline" onClick={() => setShowGold((s) => !s)}>
              {showGold ? "Visualize my labels" : "Visualize reference labels"}
            </Button>
            {checked && (
              <Badge variant={agreement >= 0.8 ? "success" : "warning"}>
                Agreement with reference: {pct(agreement)}
              </Badge>
            )}
          </div>
          {checked && agreement < 1 && (
            <p className="text-xs text-muted-foreground">
              Disagreements are normal — “Inform” vs “Answer” and “Clarification” vs “Question” are genuinely ambiguous. That ambiguity is exactly what annotation guidelines and agreement metrics (Module 3) exist for.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversation flow {showGold ? "(reference)" : "(your labels)"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              {conv.turns.map((t, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className={cn("flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium", acts[i] ? ACT_COLOR[acts[i] as DialogueAct] : "border border-dashed text-muted-foreground")}>
                    <span className={cn("h-2 w-2 rounded-full", t.speaker === "Agent" ? "bg-agent" : "bg-customer")} />
                    {acts[i] || "unlabelled"}
                    <span className="text-[10px] font-normal opacity-70">{t.speaker}</span>
                  </div>
                  {i < conv.turns.length - 1 && <ArrowDown className="my-0.5 h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Adjacency pairs & segmentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Adjacency pairs (first part → second part)</div>
              {pairs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Label some turns to see question→answer pairs.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {pairs.map(([a, b]) => (
                    <li key={`${a}-${b}`} className="rounded-md border p-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {a + 1} {acts[a]} → {b + 1} {acts[b]}
                      </span>
                      <div className="font-mono text-xs">
                        “{conv.turns[a].text}” → “{conv.turns[b].text}”
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                A bare “haan” / “Yes.” is only interpretable through the question it answers — that’s why evidence extraction must look at adjacency pairs, not single turns.
              </p>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Segments (reference) — topic shifts at boundaries</div>
              <div className="space-y-1">
                {segments.map((s, k) => (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    <Badge variant={k % 2 ? "info" : "default"} className="w-36 justify-center">
                      {s.name}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      turns {s.start + 1}
                      {s.end > s.start ? `–${s.end + 1}` : ""}
                    </span>
                    {k > 0 && <span className="text-[10px] text-warning">↑ shift</span>}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {checked && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {agreement === 1 ? <Check className="h-3.5 w-3.5 text-success" /> : <X className="h-3.5 w-3.5 text-danger" />}
          Your labels are kept per conversation while you stay on this page — switch conversations to practise on noisier calls.
        </div>
      )}
    </div>
  );
}
