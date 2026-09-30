"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Lightbulb,
  Wrench,
  Sparkles,
  AlertTriangle,
  Scale,
  ListChecks,
  Target,
  Briefcase,
  HelpCircle,
  Code2,
  FlaskConical,
} from "lucide-react";
import { LESSON_MAP, MODULE_MAP, ALL_LESSONS, STAGE_MAP } from "@/content/modules";
import type { ConceptQuestions } from "@/content/types";
import { Badge, ProgressBar, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { Rich, RichInline } from "@/components/shared/Rich";
import { TranscriptViewer } from "@/components/shared/TranscriptViewer";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { GlossaryPopup } from "@/components/shared/GlossaryPopup";
import { Quiz, ExerciseList } from "./Quiz";
import { LabHost } from "@/components/labs/LabHost";
import { CodeSnippetBlock } from "@/components/shared/CodeSnippetBlock";
import { useHydrated, useProgress } from "@/lib/store/progress";
import { lessonMastery } from "@/lib/mastery";
import { pct } from "@/lib/utils";

const SECTIONS = [
  { id: "why", label: "Why" },
  { id: "concept", label: "Concept" },
  { id: "ten", label: "10 questions" },
  { id: "lab", label: "Lab" },
  { id: "exercises", label: "Exercises" },
  { id: "real-world", label: "Real world" },
  { id: "mistakes", label: "Mistakes" },
  { id: "decision", label: "Decision" },
  { id: "quiz", label: "Quiz" },
  { id: "challenge", label: "Challenge" },
];

const TEN: { key: keyof ConceptQuestions; q: string }[] = [
  { key: "what", q: "What is it?" },
  { key: "why", q: "Why does it exist?" },
  { key: "problem", q: "What problem does it solve?" },
  { key: "how", q: "How does it work internally?" },
  { key: "onRealData", q: "What does it look like on real transcript data?" },
  { key: "whatCanGoWrong", q: "What can go wrong?" },
  { key: "howToEvaluate", q: "How do I evaluate it?" },
  { key: "whenToUse", q: "When should I use it?" },
  { key: "whenNotToUse", q: "When should I NOT use it?" },
  { key: "downstream", q: "How does it affect downstream systems?" },
];

export function LessonView({ slug }: { slug: string }) {
  const lesson = LESSON_MAP[slug];
  const mod = MODULE_MAP[lesson.module];
  const visitLesson = useProgress((s) => s.visitLesson);
  const progress = useProgress((s) => s.lessons[slug]);
  const reviews = useProgress((s) => s.reviews);
  const hydrated = useHydrated();
  const m = lessonMastery(lesson, hydrated ? progress : undefined, hydrated ? reviews : {});

  useEffect(() => {
    if (hydrated) visitLesson(slug);
  }, [hydrated, slug, visitLesson]);

  const idx = ALL_LESSONS.findIndex((l) => l.slug === slug);
  const prev = ALL_LESSONS[idx - 1];
  const next = ALL_LESSONS[idx + 1];

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link href="/roadmap" className="hover:text-foreground">
            Module {mod.number} · {mod.short}
          </Link>
          <span>/</span>
          <span>Lesson {idx + 1} of {ALL_LESSONS.length}</span>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-tight">{lesson.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{lesson.tagline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="muted">{lesson.difficulty}</Badge>
              <Badge variant="muted">
                <Clock className="h-3 w-3" /> {lesson.minutes} min
              </Badge>
              {lesson.stages.map((s) => (
                <Link key={s} href={`/system#${s}`}>
                  <Badge variant="outline" className="hover:bg-muted">
                    Pipeline: {STAGE_MAP[s].title}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
          <div className="w-full rounded-lg border bg-card p-3 lg:w-64">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Mastery</span>
              <span className="font-mono">{hydrated ? pct(m.score) : "—"}</span>
            </div>
            <ProgressBar value={hydrated ? m.score : 0} className="mt-1.5" tone={m.status === "mastered" ? "success" : "primary"} />
            <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] leading-tight text-muted-foreground">
              <div>
                Quiz<div className="font-mono text-foreground">{hydrated ? pct(m.quiz) : "—"}</div>
              </div>
              <div>
                Exercises<div className="font-mono text-foreground">{hydrated ? pct(m.exercises) : "—"}</div>
              </div>
              <div>
                Challenge<div className="font-mono text-foreground">{hydrated ? pct(m.challenge) : "—"}</div>
              </div>
            </div>
          </div>
        </div>
        <nav className="sticky top-14 z-10 -mx-1 flex gap-1 overflow-x-auto border-b bg-background/90 px-1 py-2 backdrop-blur">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      <Section id="why" icon={Target} title="Why this matters">
        <Rich text={lesson.why} />
      </Section>

      <Section id="concept" icon={Lightbulb} title="Core concept" subtitle="Technical explanation + simple intuition + example">
        <div className="space-y-4">
          {lesson.concepts.map((c) => (
            <div key={c.title} className="rounded-lg border bg-card p-5">
              <h3 className="mb-3 font-semibold">{c.title}</h3>
              <Tabs defaultValue="intuition">
                <TabsList>
                  <TabsTrigger value="intuition">Intuition</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="example">Example</TabsTrigger>
                </TabsList>
                <TabsContent value="intuition">
                  <Rich text={c.intuition} />
                </TabsContent>
                <TabsContent value="technical">
                  <Rich text={c.technical} />
                </TabsContent>
                <TabsContent value="example">
                  <Rich text={c.example} />
                </TabsContent>
              </Tabs>
            </div>
          ))}
        </div>
      </Section>

      <Section id="ten" icon={HelpCircle} title="The 10 questions" subtitle="Every important concept should answer all of these">
        <div className="grid gap-3 md:grid-cols-2">
          {TEN.map((t, i) => (
            <details key={t.key} className="group rounded-lg border bg-card p-4 open:bg-subtle" open={i < 2}>
              <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-muted font-mono text-[11px]">{i + 1}</span>
                {t.q}
              </summary>
              <div className="mt-2 text-sm">
                <Rich text={lesson.questions[t.key]} className="text-sm" />
              </div>
            </details>
          ))}
        </div>
      </Section>

      <Section
        id="lab"
        icon={FlaskConical}
        title={`Interactive lab: ${lesson.lab.title}`}
        subtitle={lesson.lab.intro}
        extra={
          <div className="flex flex-wrap gap-1.5">
            {lesson.lab.modes.map((md) => (
              <ModeBadge key={md} mode={md} />
            ))}
          </div>
        }
      >
        <LabHost slug={slug} />
      </Section>

      {lesson.code && (
        <Section id="code" icon={Code2} title={lesson.code.title} subtitle="Real Python, running in your browser (Pyodide)">
          <CodeSnippetBlock snippet={lesson.code} />
        </Section>
      )}

      <Section id="exercises" icon={Wrench} title="Try it yourself" subtitle="Conceptual (A), applied (B) and engineering (C) exercises">
        <ExerciseList questions={lesson.exercises} lesson={slug} />
      </Section>

      <Section id="real-world" icon={Briefcase} title="Real-world application">
        <div className="space-y-3">
          <Rich text={lesson.realWorld.text} />
          {lesson.realWorld.transcript && <TranscriptViewer turns={lesson.realWorld.transcript} />}
        </div>
      </Section>

      <Section id="mistakes" icon={AlertTriangle} title="Common mistakes">
        <div className="grid gap-3 md:grid-cols-2">
          {lesson.mistakes.map((mk) => (
            <div key={mk.mistake} className="rounded-lg border bg-card p-4">
              <div className="flex items-start gap-2 font-medium">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <RichInline text={mk.mistake} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                <RichInline text={mk.why} />
              </p>
              <p className="mt-2 text-sm">
                <span className="font-medium text-success">Fix: </span>
                <RichInline text={mk.fix} />
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="decision" icon={Scale} title="Engineering decision" subtitle={lesson.decision.question}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-success/30 bg-success-soft p-4">
            <div className="mb-2 text-sm font-semibold text-success">Use it when</div>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {lesson.decision.useWhen.map((u) => (
                <li key={u}>
                  <RichInline text={u} />
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-danger/30 bg-danger-soft p-4">
            <div className="mb-2 text-sm font-semibold text-danger">Avoid it when</div>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {lesson.decision.avoidWhen.map((u) => (
                <li key={u}>
                  <RichInline text={u} />
                </li>
              ))}
            </ul>
          </div>
        </div>
        {lesson.decision.tradeoffs.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border">
            <div className="bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trade-offs</div>
            {lesson.decision.tradeoffs.map((t) => (
              <div key={t.a + t.b} className="grid gap-2 border-t bg-card px-4 py-3 text-sm md:grid-cols-[220px_1fr]">
                <div className="font-medium">
                  {t.a} <span className="text-muted-foreground">vs</span> {t.b}
                </div>
                <div className="text-muted-foreground">
                  <RichInline text={t.note} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section id="quiz" icon={ListChecks} title="Quiz" subtitle="Pass mark 60%. Missed questions go to your mistake log and spaced review.">
        <Quiz questions={lesson.quiz} lesson={slug} />
      </Section>

      <Section id="challenge" icon={Sparkles} title="Advanced challenge">
        <ExerciseList questions={[lesson.challenge]} lesson={slug} source="challenge" />
      </Section>

      {lesson.terms.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key terms in this lesson</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
            {lesson.terms.map((t) => (
              <GlossaryPopup key={t} termKey={t} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-between">
        {prev ? (
          <Link href={`/learn/${prev.slug}`} className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
            <div>
              <div className="text-xs text-muted-foreground">Previous</div>
              {prev.title}
            </div>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/learn/${next.slug}`} className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-right text-sm hover:bg-muted">
            <div>
              <div className="text-xs text-muted-foreground">Next</div>
              {next.title}
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link href="/capstone" className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-right text-sm hover:bg-muted">
            <div>
              <div className="text-xs text-muted-foreground">Finish</div>
              Capstone project
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  subtitle,
  extra,
  children,
}: {
  id: string;
  icon: typeof Target;
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-4 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            <Icon className="h-4 w-4" />
            {title}
          </h2>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}
