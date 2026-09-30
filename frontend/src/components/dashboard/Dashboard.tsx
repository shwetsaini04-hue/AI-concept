"use client";

import Link from "next/link";
import { ArrowRight, Flame, Target, AlertTriangle, Repeat, BookOpen, CheckCircle2, Sparkles, Trophy, Info } from "lucide-react";
import { ALL_LESSONS, LESSON_MAP, MODULES, PIPELINE, lessonsForStage } from "@/content/modules";
import { getConcept } from "@/content/concepts";
import { useHydrated, useProgress } from "@/lib/store/progress";
import { accuracyBy, allMastery, dueReviews, MASTERY_FORMULA, moduleMastery, streak, weakConcepts } from "@/lib/mastery";
import { nextLesson } from "@/lib/recommend";
import { Badge, Card, CardContent, CardHeader, CardTitle, Stat, Tip, buttonVariants } from "@/components/ui/primitives";
import { cn, pct } from "@/lib/utils";

function TextBar({ value }: { value: number }) {
  const filled = Math.round(value * 10);
  return (
    <span className="font-mono tracking-tight">
      <span className="text-primary">{"█".repeat(filled)}</span>
      <span className="text-muted-foreground/40">{"░".repeat(10 - filled)}</span>
    </span>
  );
}

export function Dashboard() {
  const hydrated = useHydrated();
  const state = useProgress();
  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  const mastery = allMastery(state);
  const statuses = Object.values(mastery);
  const completed = ALL_LESSONS.filter((l) => ["completed", "mastered"].includes(mastery[l.slug].status));
  const learning = ALL_LESSONS.filter((l) => mastery[l.slug].status === "learning");
  const overall = statuses.reduce((a, m) => a + m.score, 0) / ALL_LESSONS.length;
  const quiz = accuracyBy(state, ["quiz"]);
  const exercise = accuracyBy(state, ["exercise", "challenge"]);
  const weak = weakConcepts(state, 5);
  const due = dueReviews(state.reviews);
  const recent = state.mistakes.filter((m) => !m.resolved).slice(0, 5);
  const next = nextLesson(mastery);
  const days = streak(state.activity);
  const isNew = state.attempts.length === 0;
  const capstoneScore = typeof state.capstone.lastScore === "number" ? (state.capstone.lastScore as number) : null;

  // Weakest area: concept with most open mistakes, else lowest-mastery attempted lesson.
  const weakest = weak[0]
    ? { title: getConcept(weak[0].concept).name, lesson: LESSON_MAP[weak[0].lesson], concept: weak[0].concept, reason: `${weak[0].openMistakes} open mistake(s), ${pct(weak[0].accuracy)} accuracy` }
    : (() => {
        const attempted = ALL_LESSONS.filter((l) => mastery[l.slug].attempted).sort((a, b) => mastery[a.slug].score - mastery[b.slug].score)[0];
        return attempted ? { title: attempted.title, lesson: attempted, concept: null as string | null, reason: `mastery ${pct(mastery[attempted.slug].score)}` } : null;
      })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isNew ? "Welcome to the Transcript AI Lab" : "Your learning dashboard"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Learn to reason about noisy call-transcript systems end to end: NLP → LLM engineering → evaluation → taxonomy. Every lesson follows concept → demo → lab → exercise → feedback → quiz → challenge.
          </p>
        </div>
        <Link href={`/learn/${next.lesson.slug}`} className={buttonVariants()}>
          {isNew ? "Start with Tokenization" : "Continue learning"} <ArrowRight />
        </Link>
      </div>

      {isNew && (
        <Card className="border-primary/30 bg-primary-soft">
          <CardContent className="grid gap-4 p-5 md:grid-cols-3">
            <div className="flex gap-3">
              <BookOpen className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <div className="font-semibold">33 lessons, 4 modules</div>
                Every lesson has an interactive lab, 3+ exercises, a 5-question quiz and an advanced challenge.
              </div>
            </div>
            <div className="flex gap-3">
              <Target className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <div className="font-semibold">Performance-based mastery</div>
                Opening a lesson counts for nothing. Quizzes, exercises, challenges and spaced reviews do.
              </div>
            </div>
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <div className="font-semibold">Honest labs</div>
                Every result is labelled REAL MODEL, SIMULATED, PRECOMPUTED or LIVE COMPUTATION.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Overall mastery" value={pct(overall)} sub={<Tip content={MASTERY_FORMULA}><span className="inline-flex cursor-help items-center gap-1">how it's computed <Info className="h-3 w-3" /></span></Tip>} />
        <Stat label="Topics completed" value={`${completed.length}/${ALL_LESSONS.length}`} sub="quiz ≥ 60%" />
        <Stat label="Currently learning" value={learning.length} sub="started, not passed" />
        <Stat label="Quiz accuracy" value={quiz.acc === null ? "—" : pct(quiz.acc)} sub={`${quiz.n} answers`} />
        <Stat label="Exercise accuracy" value={exercise.acc === null ? "—" : pct(exercise.acc)} sub={`${exercise.n} attempts`} />
        <Stat
          label="Learning streak"
          value={
            <span className="flex items-center gap-1">
              <Flame className={cn("h-5 w-5", days ? "text-warning" : "text-muted-foreground")} /> {days} day{days === 1 ? "" : "s"}
            </span>
          }
          sub={`${state.activity.length} active days total`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mastery by category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MODULES.map((m) => {
              const v = moduleMastery(m.id, mastery);
              return (
                <Link key={m.id} href="/roadmap" className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted sm:grid-cols-[220px_auto_60px]">
                  <span className="truncate font-medium">{m.short}</span>
                  <TextBar value={v} />
                  <span className="text-right font-mono tabular-nums">{pct(v)}</span>
                </Link>
              );
            })}
            <div className="mt-4 border-t pt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline coverage</div>
              <div className="flex flex-wrap items-center gap-1">
                {PIPELINE.map((s, i) => {
                  const ls = lessonsForStage(s.id);
                  const v = ls.length ? ls.reduce((a, l) => a + mastery[l.slug].score, 0) / ls.length : 0;
                  return (
                    <span key={s.id} className="flex items-center gap-1">
                      <Tip content={`${s.title}: ${pct(v)} mastery across ${ls.length} lesson(s)`}>
                        <Link
                          href={`/system#${s.id}`}
                          className={cn("rounded px-2 py-1 text-[11px] font-medium", v >= 0.75 ? "bg-success-soft text-success" : v >= 0.3 ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground")}
                        >
                          {s.title}
                        </Link>
                      </Tip>
                      {i < PIPELINE.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                    </span>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" /> Recommended next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/learn/${next.lesson.slug}`} className="block rounded-lg border p-3 hover:bg-muted">
                <div className="font-medium">{next.lesson.title}</div>
                <div className="text-xs text-muted-foreground">{next.reason}</div>
              </Link>
              {due.length > 0 && (
                <Link href="/review" className="mt-2 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm hover:opacity-90">
                  <Repeat className="h-4 w-4 text-warning" />
                  <span>
                    <b>{due.length}</b> review card{due.length === 1 ? "" : "s"} due today
                  </span>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-danger" /> Weakest area
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weakest ? (
                <div className="space-y-2 text-sm">
                  <div>
                    Your weakest area: <b>{weakest.title}</b>
                  </div>
                  <div className="text-xs text-muted-foreground">{weakest.reason}</div>
                  <div className="flex flex-col gap-1 pt-1">
                    {weakest.concept && (
                      <Link href={`/practice?concept=${weakest.concept}`} className="text-primary hover:underline">
                        → 5-minute targeted practice
                      </Link>
                    )}
                    {weakest.lesson && (
                      <Link href={`/learn/${weakest.lesson.slug}#concept`} className="text-primary hover:underline">
                        → Re-read “{weakest.lesson.title}” core concept
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No weak areas yet — answer some questions and this will point at what to revise.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Weak concepts</CardTitle>
          </CardHeader>
          <CardContent>
            {weak.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing flagged. Concepts appear here after wrong answers or low accuracy.</p>
            ) : (
              <ul className="space-y-2">
                {weak.map((w) => (
                  <li key={w.concept} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/practice?concept=${w.concept}`} className="truncate hover:text-primary hover:underline">
                      {w.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {w.openMistakes} open · {pct(w.accuracy)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent mistakes</CardTitle>
            <Link href="/mistakes" className="text-xs text-primary hover:underline">
              All mistakes →
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open mistakes. Wrong answers are logged here with why they were wrong.</p>
            ) : (
              <ul className="space-y-2">
                {recent.map((m) => (
                  <li key={m.id} className="text-sm">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                      <span className="line-clamp-2">{m.question.replace(/\*\*|`|\[\[|\]\]/g, "")}</span>
                    </div>
                    <div className="ml-5 text-xs text-muted-foreground">{LESSON_MAP[m.lesson]?.title}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">Currently learning</div>
              {learning.length ? (
                <div className="flex flex-wrap gap-1">
                  {learning.map((l) => (
                    <Link key={l.slug} href={`/learn/${l.slug}`}>
                      <Badge variant="warning">{l.title}</Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">Completed</div>
              {completed.length ? (
                <div className="flex flex-wrap gap-1">
                  {completed.map((l) => (
                    <Link key={l.slug} href={`/learn/${l.slug}`}>
                      <Badge variant={mastery[l.slug].status === "mastered" ? "success" : "default"}>
                        <CheckCircle2 className="h-3 w-3" /> {l.title}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div className="flex items-center gap-2 border-t pt-3">
              <Trophy className="h-4 w-4 text-warning" />
              <Link href="/capstone" className="hover:underline">
                Capstone {capstoneScore !== null ? `— last score ${Math.round(capstoneScore)}/100` : "— not started"}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
