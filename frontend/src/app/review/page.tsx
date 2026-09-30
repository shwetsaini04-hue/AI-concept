"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Repeat } from "lucide-react";
import { LESSON_MAP, QUESTION_INDEX } from "@/content/modules";
import { QuestionCard } from "@/components/lesson/QuestionCard";
import { REVIEW_INTERVALS, useHydrated, useProgress, type ReviewCard } from "@/lib/store/progress";
import { dueReviews } from "@/lib/mastery";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/primitives";
import { DAY_MS, relativeDay } from "@/lib/utils";

const BOX_LABEL = ["today", "2 days", "7 days", "14 days", "30 days"];

export default function ReviewPage() {
  const hydrated = useHydrated();
  const reviews = useProgress((s) => s.reviews);
  const reviewAnswer = useProgress((s) => s.reviewAnswer);
  const [session, setSession] = useState<ReviewCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [graded, setGraded] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const due = useMemo(() => (hydrated ? dueReviews(reviews).filter((c) => QUESTION_INDEX[c.qid]) : []), [hydrated, reviews]);
  const upcoming = useMemo(() => {
    const groups: Record<string, number> = {};
    Object.values(reviews)
      .filter((c) => c.due > Date.now() && QUESTION_INDEX[c.qid])
      .sort((a, b) => a.due - b.due)
      .forEach((c) => {
        const k = relativeDay(c.due);
        groups[k] = (groups[k] ?? 0) + 1;
      });
    return groups;
  }, [reviews]);
  const boxes = useMemo(() => REVIEW_INTERVALS.map((_, b) => Object.values(reviews).filter((c) => c.box === b).length), [reviews]);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;

  const card = session?.[idx];
  const item = card ? QUESTION_INDEX[card.qid] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Spaced revision</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Questions you've answered come back on a Leitner schedule: wrong answers are due <b>today</b>; each correct review moves a card to a longer interval — {REVIEW_INTERVALS.slice(1).join(", ")} days. A wrong
          review sends it back to the start.
        </p>
      </div>

      {!session && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" /> Review today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {due.length === 0 ? (
                <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="Nothing due right now">
                  Take a lesson quiz — its questions will be scheduled here. Missed questions come back today.
                </EmptyState>
              ) : (
                <div className="space-y-3">
                  <div className="text-3xl font-semibold">
                    {due.length} <span className="text-base font-normal text-muted-foreground">card{due.length === 1 ? "" : "s"} due</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set(due.map((d) => d.lesson))].map((l) => (
                      <Badge key={l} variant="muted">
                        {LESSON_MAP[l]?.title}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    onClick={() => {
                      setSession(due.slice(0, 15));
                      setIdx(0);
                      setGraded(false);
                      setScore({ right: 0, total: 0 });
                    }}
                  >
                    Start review ({Math.min(15, due.length)} cards) <ArrowRight />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Upcoming</div>
                {Object.keys(upcoming).length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  Object.entries(upcoming).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b py-1">
                      <span>Review {k}</span>
                      <span className="font-mono">{v}</span>
                    </div>
                  ))
                )}
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Cards per interval box</div>
                {boxes.map((b, i) => (
                  <div key={i} className="flex justify-between border-b py-1">
                    <span>Box {i + 1} · next in {BOX_LABEL[i]}</span>
                    <span className="font-mono">{b}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {session && item && card && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Card {idx + 1} of {session.length} · from{" "}
              <Link className="hover:underline" href={`/learn/${item.lesson}`}>
                {LESSON_MAP[item.lesson]?.title}
              </Link>{" "}
              · box {card.box + 1}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSession(null)}>
              End session
            </Button>
          </div>
          <QuestionCard
            key={card.qid + idx}
            question={item.question}
            lesson={item.lesson}
            source="review"
            onGraded={(r) => {
              reviewAnswer(card.qid, r.correct);
              setGraded(true);
              setScore((s) => ({ right: s.right + (r.correct ? 1 : 0), total: s.total + 1 }));
            }}
          />
          {graded && (
            <Button
              onClick={() => {
                if (idx + 1 < session.length) {
                  setIdx(idx + 1);
                  setGraded(false);
                } else setSession([]);
              }}
            >
              {idx + 1 < session.length ? "Next card" : "Finish"} <ArrowRight />
            </Button>
          )}
        </div>
      )}

      {session && session.length === 0 && (
        <Card>
          <CardContent className="space-y-2 p-6 text-center">
            <div className="text-lg font-semibold">
              Session complete: {score.right}/{score.total} correct
            </div>
            <p className="text-sm text-muted-foreground">Correct cards moved to longer intervals; missed cards will come back {relativeDay(Date.now() + DAY_MS)}.</p>
            <Button variant="outline" onClick={() => setSession(null)}>
              Back to schedule
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
