import type { Lesson, ModuleId } from "@/content/types";
import { ALL_LESSONS, lessonsByModule } from "@/content/modules";
import { getConcept } from "@/content/concepts";
import type { LessonProgress, ProgressData, ReviewCard } from "@/lib/store/progress";
import { DAY_MS, todayKey } from "@/lib/utils";

/**
 * Performance-based mastery (requirement #48). Opening a lesson is worth 0.
 *
 *   base    = 0.45 · best quiz score
 *           + 0.40 · exercise score   (first-try correct = 1, correct after retry = 0.6)
 *           + 0.15 · challenge score  (first-try = 1, after retry = 0.7)
 *   mastery = 0.85 · base + 0.15 · review accuracy   (only once spaced reviews exist)
 */
export const MASTERY_FORMULA =
  "0.45·quiz + 0.40·exercises + 0.15·challenge, blended 85/15 with spaced-review accuracy once reviews exist. Opening a lesson counts for nothing.";

export type LessonStatus = "not-started" | "learning" | "completed" | "mastered";

export interface LessonMastery {
  score: number;
  quiz: number;
  exercises: number;
  challenge: number;
  review: number | null;
  status: LessonStatus;
  attempted: boolean;
}

export function lessonMastery(lesson: Lesson, p: LessonProgress | undefined, reviews: Record<string, ReviewCard>): LessonMastery {
  const quiz = p?.quizBest ?? 0;
  const exIds = lesson.exercises.map((e) => e.id);
  const exScore = exIds.length
    ? exIds.reduce((acc, id) => {
        const r = p?.exercises[id];
        if (!r) return acc;
        return acc + (r.firstTryCorrect ? 1 : r.correct ? 0.6 : 0);
      }, 0) / exIds.length
    : 0;
  const ch = p?.challenge;
  const challenge = ch ? (ch.firstTryCorrect ? 1 : ch.correct ? 0.7 : 0) : 0;
  const base = 0.45 * quiz + 0.4 * exScore + 0.15 * challenge;

  const cards = Object.values(reviews).filter((c) => c.lesson === lesson.slug && c.reviews > 0);
  const review = cards.length ? cards.filter((c) => c.lastResult).length / cards.length : null;
  const score = review === null ? base : 0.85 * base + 0.15 * review;

  const attempted = !!p && (p.quizAttempts > 0 || Object.keys(p.exercises).length > 0 || !!p.challenge);
  let status: LessonStatus = "not-started";
  if (attempted || p?.labUsed) status = "learning";
  if ((p?.quizBest ?? 0) >= 0.6) status = "completed";
  if (status === "completed" && score >= 0.8) status = "mastered";
  return { score, quiz, exercises: exScore, challenge, review, status, attempted };
}

export function allMastery(data: Pick<ProgressData, "lessons" | "reviews">) {
  const out: Record<string, LessonMastery> = {};
  for (const l of ALL_LESSONS) out[l.slug] = lessonMastery(l, data.lessons[l.slug], data.reviews);
  return out;
}

export function moduleMastery(id: ModuleId, m: Record<string, LessonMastery>) {
  const ls = lessonsByModule(id);
  if (!ls.length) return 0;
  return ls.reduce((a, l) => a + (m[l.slug]?.score ?? 0), 0) / ls.length;
}

export function streak(activity: string[]) {
  const set = new Set(activity);
  let count = 0;
  let d = new Date();
  // A streak survives if you haven't studied yet today but did yesterday.
  if (!set.has(todayKey(d))) d = new Date(d.getTime() - DAY_MS);
  while (set.has(todayKey(d))) {
    count++;
    d = new Date(d.getTime() - DAY_MS);
  }
  return count;
}

export interface ConceptStat {
  concept: string;
  name: string;
  mistakeLabel: string;
  lesson: string;
  attempts: number;
  correct: number;
  accuracy: number;
  openMistakes: number;
}

export function conceptStats(data: Pick<ProgressData, "attempts" | "mistakes">): ConceptStat[] {
  const by: Record<string, ConceptStat> = {};
  const get = (id: string) => {
    if (!by[id]) {
      const c = getConcept(id);
      by[id] = { concept: id, name: c.name, mistakeLabel: c.mistakeLabel, lesson: c.lesson, attempts: 0, correct: 0, accuracy: 0, openMistakes: 0 };
    }
    return by[id];
  };
  for (const a of data.attempts) {
    const s = get(a.concept);
    s.attempts++;
    if (a.correct) s.correct++;
  }
  for (const m of data.mistakes) if (!m.resolved) get(m.concept).openMistakes++;
  return Object.values(by).map((s) => ({ ...s, accuracy: s.attempts ? s.correct / s.attempts : 0 }));
}

/** Concepts ranked from weakest: open mistakes first, then low accuracy with enough attempts. */
export function weakConcepts(data: Pick<ProgressData, "attempts" | "mistakes">, n = 5) {
  return conceptStats(data)
    .filter((s) => s.openMistakes > 0 || (s.attempts >= 2 && s.accuracy < 0.7))
    .sort((a, b) => b.openMistakes - a.openMistakes || a.accuracy - b.accuracy)
    .slice(0, n);
}

export function accuracyBy(data: Pick<ProgressData, "attempts">, sources: string[]) {
  const xs = data.attempts.filter((a) => sources.includes(a.source));
  return { n: xs.length, acc: xs.length ? xs.filter((a) => a.correct).length / xs.length : null };
}

export function dueReviews(reviews: Record<string, ReviewCard>, now = Date.now()) {
  return Object.values(reviews)
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due);
}
