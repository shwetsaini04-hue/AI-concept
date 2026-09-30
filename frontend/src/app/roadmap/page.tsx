"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, CircleDot, Star, Trophy, Clock } from "lucide-react";
import { MODULES, lessonsByModule, STAGE_MAP } from "@/content/modules";
import { useHydrated, useProgress } from "@/lib/store/progress";
import { allMastery, moduleMastery, type LessonStatus } from "@/lib/mastery";
import { Badge, ProgressBar } from "@/components/ui/primitives";
import { cn, pct } from "@/lib/utils";

const STATUS: Record<LessonStatus, { icon: typeof Circle; cls: string; label: string }> = {
  "not-started": { icon: Circle, cls: "border-border text-muted-foreground", label: "Not started" },
  learning: { icon: CircleDot, cls: "border-warning/60 text-warning", label: "Learning" },
  completed: { icon: CheckCircle2, cls: "border-primary/60 text-primary", label: "Completed" },
  mastered: { icon: Star, cls: "border-success/60 text-success", label: "Mastered" },
};

function Ring({ v }: { v: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--muted)" strokeWidth="4" />
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--primary)" strokeWidth="4" strokeDasharray={`${v * c} ${c}`} transform="rotate(-90 18 18)" strokeLinecap="round" />
      <text x="18" y="21.5" textAnchor="middle" fontSize="9" fill="var(--foreground)" fontFamily="var(--font-mono)">
        {Math.round(v * 100)}
      </text>
    </svg>
  );
}

export default function RoadmapPage() {
  const hydrated = useHydrated();
  const lessons = useProgress((s) => s.lessons);
  const reviews = useProgress((s) => s.reviews);
  const capstoneScore = useProgress((s) => s.capstone.lastScore as number | undefined);
  const mastery = hydrated ? allMastery({ lessons, reviews }) : {};
  let n = 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning path</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Four modules that follow the transcript pipeline: understand the noisy text, engineer the LLM system, measure it honestly, then design the categories it extracts. Each lesson: concept → intuition → visual →
          interactive lab → realistic example → exercises → feedback → error analysis → quiz → challenge.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {(Object.keys(STATUS) as LessonStatus[]).map((s) => {
            const Icon = STATUS[s].icon;
            return (
              <span key={s} className="flex items-center gap-1 text-muted-foreground">
                <Icon className={cn("h-3.5 w-3.5", STATUS[s].cls)} /> {STATUS[s].label}
              </span>
            );
          })}
        </div>
      </div>

      {MODULES.map((m) => {
        const ls = lessonsByModule(m.id);
        const mm = hydrated ? moduleMastery(m.id, mastery) : 0;
        return (
          <section key={m.id} className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">Module {m.number}</div>
                <h2 className="text-lg font-semibold">{m.title}</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">{m.description}</p>
              </div>
              <div className="w-full sm:w-56">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Module mastery</span>
                  <span className="font-mono">{pct(mm)}</span>
                </div>
                <ProgressBar value={mm} className="mt-1" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ls.map((l) => {
                n++;
                const st = mastery[l.slug]?.status ?? "not-started";
                const S = STATUS[st];
                const Icon = S.icon;
                return (
                  <Link key={l.slug} href={`/learn/${l.slug}`} className={cn("group relative flex gap-3 rounded-lg border-2 bg-card p-3 transition-colors hover:bg-muted", S.cls)}>
                    <Ring v={mastery[l.slug]?.score ?? 0} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-muted-foreground">{String(n).padStart(2, "0")}</span>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="font-medium text-foreground">{l.title}</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">{l.tagline}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badge variant="muted" className="text-[10px]">
                          <Clock className="h-2.5 w-2.5" /> {l.minutes}m
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {STAGE_MAP[l.stages[0]].title}
                        </Badge>
                      </div>
                    </div>
                    <ArrowRight className="absolute right-2 top-2 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <Link href="/capstone" className="flex items-center gap-4 rounded-xl border-2 border-warning/50 bg-warning-soft p-5 hover:opacity-90">
        <Trophy className="h-8 w-8 text-warning" />
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-warning">Final capstone</div>
          <div className="text-lg font-semibold">Build a Transcript Intelligence Pipeline</div>
          <div className="text-sm text-muted-foreground">Taxonomy, guidelines, labels, prompts, schema, metrics, error analysis, architecture — scored against a visible rubric.</div>
        </div>
        {hydrated && capstoneScore !== undefined && <Badge variant="warning">Last score {Math.round(capstoneScore)}/100</Badge>}
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
