"use client";

import { useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json as jsonLang } from "@codemirror/lang-json";
import { Check, X, Lightbulb, RotateCcw, Eye } from "lucide-react";
import type { Question } from "@/content/types";
import { Badge, Button, Callout, Input, Select, Textarea } from "@/components/ui/primitives";
import { RichInline, Rich } from "@/components/shared/Rich";
import { TranscriptViewer } from "@/components/shared/TranscriptViewer";
import { emptyAnswer, grade, isAnswered, type AnswerValue, type GradeResult } from "@/lib/grading";
import { useProgress, type AttemptSource } from "@/lib/store/progress";
import { cn } from "@/lib/utils";

const EX_TYPE_LABEL = { conceptual: "Type A · Conceptual", applied: "Type B · Applied", engineering: "Type C · Engineering" } as const;
const DIFF_VARIANT = { Beginner: "success", Intermediate: "info", Advanced: "warning", Expert: "danger" } as const;

export type Phase = "answering" | "hinted" | "revealed";

/**
 * One question with the full feedback loop:
 *   normal mode:   answer → check → feedback + explanation
 *   Socratic mode: answer → (wrong) hint → second attempt → explanation
 * Every graded attempt is recorded; wrong answers go to the mistake DB and spaced revision.
 */
export function QuestionCard({
  question,
  lesson,
  source,
  index,
  compact = false,
  onGraded,
  deferRecording = false,
}: {
  question: Question;
  lesson: string;
  source: AttemptSource;
  index?: number;
  compact?: boolean;
  /** Called with the final result of this question (after the last allowed attempt). */
  onGraded?: (r: GradeResult, firstTry: boolean) => void;
  /** Quiz mode: don't reveal explanation until the parent says so. */
  deferRecording?: boolean;
}) {
  const socratic = useProgress((s) => s.settings.socratic);
  const recordAnswer = useProgress((s) => s.recordAnswer);
  const [answer, setAnswer] = useState<AnswerValue>(() => emptyAnswer(question));
  const [phase, setPhase] = useState<Phase>("answering");
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<GradeResult | null>(null);

  const answered = isAnswered(question, answer);
  const locked = phase === "revealed";

  function check() {
    const r = grade(question, answer);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setResult(r);
    const firstTry = nextAttempts === 1;
    // Socratic: first wrong attempt gives a hint and another try, no reveal yet.
    if (!r.correct && socratic && nextAttempts === 1) {
      setPhase("hinted");
      return;
    }
    setPhase("revealed");
    if (!deferRecording) {
      recordAnswer({
        qid: question.id,
        lesson,
        concept: question.concept,
        source,
        correct: r.correct,
        firstTry,
        mistake: r.correct
          ? undefined
          : { question: question.prompt, userAnswer: r.userAnswerText, correctAnswer: r.correctAnswerText, why: r.why || question.explanation },
      });
    }
    onGraded?.(r, firstTry);
  }

  function retry() {
    setAnswer(emptyAnswer(question));
    setPhase("answering");
    setResult(null);
  }

  return (
    <div className={cn("rounded-lg border bg-card", compact ? "p-4" : "p-5")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {index !== undefined && <span className="font-mono text-xs text-muted-foreground">Q{index + 1}</span>}
        {question.exType && <Badge variant="muted">{EX_TYPE_LABEL[question.exType]}</Badge>}
        <Badge variant={DIFF_VARIANT[question.difficulty]}>{question.difficulty}</Badge>
        {socratic && <Badge variant="info">Socratic</Badge>}
      </div>
      <div className="mb-3 font-medium leading-relaxed">
        <RichInline text={question.prompt} />
      </div>
      {question.transcript && question.kind !== "evidence" && <TranscriptViewer turns={question.transcript} className="mb-3" />}

      <AnswerInput question={question} answer={answer} setAnswer={setAnswer} disabled={locked} result={phase === "revealed" ? result : null} />

      {phase === "hinted" && (
        <Callout tone="warning" className="mt-3" title={<span className="flex items-center gap-1.5"><Lightbulb className="h-4 w-4" /> Not quite. Here's a hint — try again.</span>}>
          <RichInline text={question.hint} />
        </Callout>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!locked && (
          <Button onClick={check} disabled={!answered}>
            {phase === "hinted" ? "Check second attempt" : "Check answer"}
          </Button>
        )}
        {!locked && !socratic && phase === "answering" && (
          <HintButton hint={question.hint} />
        )}
        {locked && !result?.correct && (
          <Button variant="outline" onClick={retry}>
            <RotateCcw /> Try again
          </Button>
        )}
      </div>

      {phase === "revealed" && result && !deferRecording && <Feedback question={question} result={result} />}
    </div>
  );
}

function HintButton({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
        <Lightbulb /> {open ? "Hide hint" : "Hint"}
      </Button>
      {open && (
        <div className="basis-full rounded-md bg-warning-soft px-3 py-2 text-sm">
          <RichInline text={hint} />
        </div>
      )}
    </>
  );
}

export function Feedback({ question, result }: { question: Question; result: GradeResult }) {
  return (
    <div className={cn("mt-4 rounded-lg border p-4", result.correct ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft")}>
      <div className="mb-2 flex items-center gap-2 font-semibold">
        {result.correct ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />}
        {result.correct ? "Correct" : "Not correct"}
        {result.score > 0 && result.score < 1 && <span className="text-xs font-normal text-muted-foreground">({Math.round(result.score * 100)}% partial)</span>}
      </div>
      {!result.correct && result.why && (
        <div className="mb-2 text-sm">
          <span className="font-medium">Why this is wrong: </span>
          <RichInline text={result.why} />
        </div>
      )}
      {result.details.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
          {result.details.map((d, i) => (
            <li key={i} className="flex items-start gap-2">
              {d.ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />}
              <span>
                {d.label}
                {d.note && <span className="text-muted-foreground"> — {d.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!result.correct && question.kind !== "text" && question.kind !== "json" && question.kind !== "label" && (
        <div className="mb-2 text-sm">
          <span className="font-medium">Correct answer: </span>
          {result.correctAnswerText}
        </div>
      )}
      <div className="border-t border-foreground/10 pt-2 text-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explanation</div>
        <Rich text={question.explanation} className="text-sm" />
      </div>
      {(question.kind === "text" || question.kind === "json") && (
        <details className="mt-2 text-sm">
          <summary className="flex cursor-pointer items-center gap-1 text-primary">
            <Eye className="h-3.5 w-3.5" /> Show model answer
          </summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-card p-3 font-mono text-xs">{question.kind === "text" ? question.modelAnswer : question.modelAnswer}</pre>
        </details>
      )}
    </div>
  );
}

/* --------------------------- Answer inputs --------------------------- */

export function AnswerInput({
  question,
  answer,
  setAnswer,
  disabled,
  result,
}: {
  question: Question;
  answer: AnswerValue;
  setAnswer: (a: AnswerValue) => void;
  disabled: boolean;
  result: GradeResult | null;
}) {
  switch (question.kind) {
    case "mcq": {
      const idx = answer.kind === "mcq" ? answer.index : -1;
      return (
        <div className="space-y-2">
          {question.options.map((o, i) => {
            const chosen = idx === i;
            const showRight = !!result && o.correct;
            const showWrong = !!result && chosen && !o.correct;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => setAnswer({ kind: "mcq", index: i })}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                  !disabled && "cursor-pointer hover:bg-muted",
                  chosen && !result && "border-primary bg-primary-soft",
                  showRight && "border-success bg-success-soft",
                  showWrong && "border-danger bg-danger-soft",
                )}
              >
                <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", chosen && "border-primary")}>
                  {chosen && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="flex-1">
                  <RichInline text={o.text} />
                  {showWrong && o.whyWrong && <span className="mt-1 block text-xs text-danger">{o.whyWrong}</span>}
                </span>
              </button>
            );
          })}
        </div>
      );
    }
    case "multi": {
      const sel = answer.kind === "multi" ? answer.indices : [];
      return (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Select all that apply.</div>
          {question.options.map((o, i) => {
            const chosen = sel.includes(i);
            const bad = !!result && chosen !== !!o.correct;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => setAnswer({ kind: "multi", indices: chosen ? sel.filter((x) => x !== i) : [...sel, i] })}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                  !disabled && "cursor-pointer hover:bg-muted",
                  chosen && !result && "border-primary bg-primary-soft",
                  result && o.correct && "border-success bg-success-soft",
                  bad && chosen && "border-danger bg-danger-soft",
                )}
              >
                <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", chosen && "border-primary bg-primary text-primary-foreground")}>
                  {chosen && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1">
                  <RichInline text={o.text} />
                </span>
              </button>
            );
          })}
        </div>
      );
    }
    case "numeric": {
      const v = answer.kind === "numeric" ? answer.value : NaN;
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="any"
            className="max-w-[200px] font-mono"
            disabled={disabled}
            value={Number.isFinite(v) ? v : ""}
            onChange={(e) => setAnswer({ kind: "numeric", value: e.target.value === "" ? NaN : Number(e.target.value) })}
            placeholder="Your answer"
          />
          {question.unit && <span className="text-sm text-muted-foreground">{question.unit}</span>}
        </div>
      );
    }
    case "text": {
      const v = answer.kind === "text" ? answer.value : "";
      return (
        <div>
          <Textarea
            rows={4}
            disabled={disabled}
            value={v}
            onChange={(e) => setAnswer({ kind: "text", value: e.target.value })}
            placeholder="Explain your reasoning in 2–4 sentences…"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Graded by a transparent keyword rubric (not an LLM) — it checks for the key ideas, then shows a model answer for self-assessment.
          </p>
        </div>
      );
    }
    case "json": {
      const v = answer.kind === "json" ? answer.value : "";
      return <JsonEditor value={v} onChange={(s) => setAnswer({ kind: "json", value: s })} disabled={disabled} />;
    }
    case "evidence": {
      const a = answer.kind === "evidence" ? answer : { kind: "evidence" as const, verdict: "", turns: [] as number[] };
      return (
        <div className="space-y-3">
          <div className="rounded-md border border-dashed px-3 py-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Claim: </span>
            {question.claim}
          </div>
          <div className="text-xs text-muted-foreground">1) Click the turn(s) that are your evidence.</div>
          <TranscriptViewer
            turns={question.transcript}
            selectable={!disabled}
            selected={a.turns}
            highlight={result ? question.evidenceTurns : []}
            onToggle={(i) => setAnswer({ ...a, turns: a.turns.includes(i) ? a.turns.filter((x) => x !== i) : [...a.turns, i] })}
          />
          <div className="text-xs text-muted-foreground">2) Choose a verdict.</div>
          <div className="flex flex-wrap gap-2">
            {question.verdicts.map((v) => (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onClick={() => setAnswer({ ...a, verdict: v })}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  !disabled && "cursor-pointer hover:bg-muted",
                  a.verdict === v && "border-primary bg-primary-soft text-primary",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case "label": {
      const vals = answer.kind === "label" ? answer.values : [];
      return (
        <div className="space-y-2">
          {question.items.map((it, i) => {
            const wrong = result && vals[i] !== it.answer;
            return (
              <div key={i} className={cn("flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center", result && (wrong ? "border-danger/50 bg-danger-soft" : "border-success/50 bg-success-soft"))}>
                <div className="flex min-w-0 flex-1 items-start gap-2 font-mono text-[13px]">
                  {it.speaker && <span className="shrink-0 text-xs font-semibold text-muted-foreground">{it.speaker}:</span>}
                  <span className="break-words">{it.text}</span>
                </div>
                <Select
                  value={vals[i] ?? ""}
                  disabled={disabled}
                  onChange={(e) => {
                    const next = [...vals];
                    next[i] = e.target.value;
                    setAnswer({ kind: "label", values: next });
                  }}
                  className="sm:w-48"
                  aria-label={`Label for item ${i + 1}`}
                >
                  <option value="">Choose…</option>
                  {question.labels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
                {result && wrong && <span className="text-xs text-danger sm:w-32">→ {it.answer}</span>}
              </div>
            );
          })}
        </div>
      );
    }
  }
}

export function JsonEditor({ value, onChange, disabled, height = "220px" }: { value: string; onChange: (s: string) => void; disabled?: boolean; height?: string }) {
  const theme = useProgress((s) => s.settings.theme);
  const extensions = useMemo(() => [jsonLang()], []);
  return (
    <div className="overflow-hidden rounded-md border text-[13px]">
      <CodeMirror
        value={value}
        height={height}
        theme={theme === "dark" ? "dark" : "light"}
        extensions={extensions}
        editable={!disabled}
        onChange={onChange}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
      />
    </div>
  );
}
