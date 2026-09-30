"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Target } from "lucide-react";
import { getConcept } from "@/content/concepts";
import { LESSON_MAP, QUESTION_INDEX, questionsForConcept, type IndexedQuestion } from "@/content/modules";
import { QuestionCard } from "@/components/lesson/QuestionCard";
import { RecommendationCard } from "@/components/lesson/Recommendation";
import { recommendAfter } from "@/lib/recommend";
import { useHydrated, useProgress } from "@/lib/store/progress";
import { EmptyState, Badge } from "@/components/ui/primitives";

function PracticeInner() {
  const params = useSearchParams();
  const concept = params.get("concept");
  const qid = params.get("q");
  const mode = params.get("mode");
  const hydrated = useHydrated();
  const mistakes = useProgress((s) => s.mistakes);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const { title, subtitle, items } = useMemo(() => {
    if (qid && QUESTION_INDEX[qid]) return { title: "Retry a question", subtitle: LESSON_MAP[QUESTION_INDEX[qid].lesson]?.title ?? "", items: [QUESTION_INDEX[qid]] };
    if (mode === "mistakes") {
      const ids = [...new Set(mistakes.filter((m) => !m.resolved).map((m) => m.qid))];
      return { title: "Revise your open mistakes", subtitle: `${ids.length} questions you previously got wrong`, items: ids.map((i) => QUESTION_INDEX[i]).filter(Boolean) as IndexedQuestion[] };
    }
    if (concept) {
      const c = getConcept(concept);
      return { title: `Targeted practice: ${c.name}`, subtitle: `All questions tagged “${c.name}” across lessons`, items: questionsForConcept(concept).slice(0, 8) };
    }
    return { title: "Practice", subtitle: "", items: [] as IndexedQuestion[] };
  }, [qid, mode, concept, mistakes]);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  const done = Object.keys(results).length;
  const missed = items.filter((it) => results[it.question.id] === false).map((it) => it.question.concept);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Target className="h-6 w-6 text-primary" /> {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        {items.length > 0 && (
          <Badge variant="muted" className="mt-2">
            {done}/{items.length} answered
          </Badge>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Nothing to practise">
          Pick a concept from your <Link href="/mistakes" className="text-primary hover:underline">mistakes</Link> or the{" "}
          <Link href="/" className="text-primary hover:underline">dashboard</Link>.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {items.map((it, i) => (
            <div key={it.question.id}>
              <div className="mb-1 text-xs text-muted-foreground">
                From <Link href={`/learn/${it.lesson}`} className="hover:underline">{LESSON_MAP[it.lesson]?.title}</Link> · {it.source}
              </div>
              <QuestionCard question={it.question} lesson={it.lesson} source="practice" index={i} onGraded={(r) => setResults((x) => ({ ...x, [it.question.id]: r.correct }))} />
            </div>
          ))}
          {done === items.length && <RecommendationCard rec={recommendAfter(missed, items[0]?.lesson)} />}
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
      <PracticeInner />
    </Suspense>
  );
}
