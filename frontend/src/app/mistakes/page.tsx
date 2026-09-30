"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, RotateCcw, Target } from "lucide-react";
import { getConcept } from "@/content/concepts";
import { LESSON_MAP } from "@/content/modules";
import { useHydrated, useProgress } from "@/lib/store/progress";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, buttonVariants } from "@/components/ui/primitives";
import { RichInline } from "@/components/shared/Rich";
import { cn } from "@/lib/utils";

export default function MistakesPage() {
  const hydrated = useHydrated();
  const mistakes = useProgress((s) => s.mistakes);
  const resolve = useProgress((s) => s.resolveMistake);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  const recurring = useMemo(() => {
    const by: Record<string, { concept: string; count: number; lessons: Set<string> }> = {};
    for (const m of mistakes.filter((x) => !x.resolved)) {
      by[m.concept] ??= { concept: m.concept, count: 0, lessons: new Set() };
      by[m.concept].count++;
      by[m.concept].lessons.add(m.lesson);
    }
    return Object.values(by).sort((a, b) => b.count - a.count);
  }, [mistakes]);

  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
  const shown = mistakes.filter((m) => (filter === "all" ? true : filter === "open" ? !m.resolved : m.resolved));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mistake-based learning</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Every wrong answer is stored with the question, your answer, the correct answer, why it was wrong and the concept to review. Recurring mistakes become targeted revision sets. A mistake is resolved when you
            later answer that question correctly in practice or review.
          </p>
        </div>
        {recurring.length > 0 && (
          <Link href="/practice?mode=mistakes" className={buttonVariants()}>
            <Target /> Revise all open mistakes
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your recurring mistakes</CardTitle>
        </CardHeader>
        <CardContent>
          {recurring.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open mistakes. 🎯 Wrong answers from quizzes, exercises and reviews will be grouped here by concept.</p>
          ) : (
            <ol className="space-y-2">
              {recurring.map((r, i) => {
                const c = getConcept(r.concept);
                return (
                  <li key={r.concept} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
                    <span className="font-mono text-sm text-muted-foreground">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="font-medium">{c.mistakeLabel}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.count} open mistake{r.count === 1 ? "" : "s"} · {[...r.lessons].map((l) => LESSON_MAP[l]?.title).filter(Boolean).join(", ")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/practice?concept=${r.concept}`} className={buttonVariants({ size: "sm" })}>
                        Targeted exercises
                      </Link>
                      {LESSON_MAP[c.lesson] && (
                        <Link href={`/learn/${c.lesson}#concept`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                          Review concept
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-1">
        {(["open", "resolved", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("cursor-pointer rounded-md border px-3 py-1.5 text-sm capitalize", filter === f && "border-primary bg-primary-soft text-primary")}>
            {f} ({mistakes.filter((m) => (f === "all" ? true : f === "open" ? !m.resolved : m.resolved)).length})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="Nothing here">
          {filter === "open" ? "No open mistakes right now." : "No mistakes in this view."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {shown.map((m) => {
            const c = getConcept(m.concept);
            return (
              <Card key={m.id} className={cn(m.resolved && "opacity-70")}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="muted">{LESSON_MAP[m.lesson]?.title ?? m.lesson}</Badge>
                    <Badge variant="outline">{m.source}</Badge>
                    <span className="text-muted-foreground">{new Date(m.at).toLocaleString()}</span>
                    {m.resolved ? <Badge variant="success">resolved</Badge> : <Badge variant="danger">open</Badge>}
                  </div>
                  <div className="font-medium">
                    <RichInline text={m.question} />
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-md bg-danger-soft p-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-danger">Your answer</div>
                      <div className="mt-0.5 line-clamp-4 whitespace-pre-wrap">{m.userAnswer}</div>
                    </div>
                    <div className="rounded-md bg-success-soft p-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-success">Correct answer</div>
                      <div className="mt-0.5 line-clamp-4 whitespace-pre-wrap">{m.correctAnswer}</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Why you were wrong: </span>
                    <RichInline text={m.why} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
                    <span className="text-muted-foreground">Concept to review:</span>
                    <Link href={`/learn/${c.lesson}#concept`} className="text-primary hover:underline">
                      {c.name}
                    </Link>
                    <div className="ml-auto flex gap-2">
                      <Link href={`/practice?q=${m.qid}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        <RotateCcw /> Retry this question
                      </Link>
                      {!m.resolved && (
                        <Button size="sm" variant="ghost" onClick={() => resolve(m.id)}>
                          <Check /> Mark resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
