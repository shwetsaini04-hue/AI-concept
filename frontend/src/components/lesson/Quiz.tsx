"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import type { Question } from "@/content/types";
import { Button, ProgressBar } from "@/components/ui/primitives";
import { QuestionCard } from "./QuestionCard";
import { RecommendationCard } from "./Recommendation";
import { recommendAfter } from "@/lib/recommend";
import { useProgress } from "@/lib/store/progress";
import { pct } from "@/lib/utils";

export function Quiz({ questions, lesson }: { questions: Question[]; lesson: string }) {
  const submitQuiz = useProgress((s) => s.submitQuiz);
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const done = Object.keys(results).length;
  const allDone = done === questions.length;
  const score = done ? Object.values(results).filter(Boolean).length / questions.length : 0;

  useEffect(() => {
    if (allDone && !submitted) {
      setSubmitted(true);
      submitQuiz(lesson, questions.map((x) => ({ qid: x.id, correct: results[x.id] })));
    }
  }, [allDone, submitted, submitQuiz, lesson, questions, results]);

  function onGraded(q: Question, correct: boolean) {
    setResults((r) => (q.id in r ? r : { ...r, [q.id]: correct }));
  }

  function retake() {
    setResults({});
    setSubmitted(false);
    setRound((r) => r + 1);
  }

  const missed = questions.filter((q) => results[q.id] === false).map((q) => q.concept);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ProgressBar value={done / questions.length} className="max-w-xs" />
        <span className="text-xs text-muted-foreground">
          {done}/{questions.length} answered
        </span>
      </div>
      {questions.map((q, i) => (
        <QuestionCard key={`${round}-${q.id}`} question={q} lesson={lesson} source="quiz" index={i} onGraded={(r) => onGraded(q, r.correct)} />
      ))}
      {allDone && (
        <div className="space-y-3 rounded-lg border bg-card p-5">
          <div className="flex items-center gap-3">
            <Trophy className={score >= 0.6 ? "h-6 w-6 text-success" : "h-6 w-6 text-warning"} />
            <div>
              <div className="text-lg font-semibold">Quiz score: {pct(score)}</div>
              <div className="text-sm text-muted-foreground">
                {score >= 0.8
                  ? "Strong. These questions are now scheduled for spaced review in 2 days."
                  : score >= 0.6
                    ? "Passed — lesson marked complete. Missed questions are due for review today."
                    : "Below the 60% pass mark. Missed questions were added to your mistake log and today's review queue."}
              </div>
            </div>
            <Button variant="outline" className="ml-auto" onClick={retake}>
              <RotateCcw /> Retake
            </Button>
          </div>
          <RecommendationCard rec={recommendAfter(missed, lesson)} />
        </div>
      )}
    </div>
  );
}

export function ExerciseList({ questions, lesson, source = "exercise" }: { questions: Question[]; lesson: string; source?: "exercise" | "challenge" }) {
  const [graded, setGraded] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <QuestionCard question={q} lesson={lesson} source={source} index={source === "exercise" ? i : undefined} onGraded={(r) => setGraded((g) => ({ ...g, [q.id]: r.correct }))} />
          {q.id in graded && <RecommendationCard rec={recommendAfter(graded[q.id] ? [] : [q.concept], lesson)} />}
        </div>
      ))}
    </div>
  );
}
