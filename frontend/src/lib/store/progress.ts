"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import { DAY_MS, todayKey, uid } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Learner progress. Persisted to localStorage and (optionally)       */
/*  synced to the FastAPI backend — see lib/api.ts + SyncProvider.     */
/* ------------------------------------------------------------------ */

export type AttemptSource = "quiz" | "exercise" | "challenge" | "review" | "practice" | "capstone";

export interface QuestionAttempt {
  qid: string;
  lesson: string;
  concept: string;
  source: AttemptSource;
  correct: boolean;
  firstTry: boolean;
  at: number;
}

export interface ExerciseResult {
  correct: boolean;
  attempts: number;
  firstTryCorrect: boolean;
}

export interface LessonProgress {
  firstOpenedAt?: number;
  lastVisitedAt?: number;
  quizBest?: number;
  quizLast?: number;
  quizAttempts: number;
  exercises: Record<string, ExerciseResult>;
  challenge?: ExerciseResult;
  labUsed?: boolean;
  completedAt?: number;
}

export interface MistakeEntry {
  id: string;
  qid: string;
  lesson: string;
  concept: string;
  source: AttemptSource;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  why: string;
  at: number;
  resolved: boolean;
}

export interface ReviewCard {
  qid: string;
  lesson: string;
  box: number; // Leitner box: 0..4
  due: number; // epoch ms
  reviews: number;
  lapses: number;
  lastResult?: boolean;
  lastReviewed?: number;
}

/** Leitner intervals in days per box: review today, in 2, 7, 14, then 30 days. */
export const REVIEW_INTERVALS = [0, 2, 7, 14, 30];

export interface Settings {
  socratic: boolean;
  theme: "light" | "dark";
}

export interface ProgressData {
  version: number;
  learnerId: string;
  lessons: Record<string, LessonProgress>;
  attempts: QuestionAttempt[];
  mistakes: MistakeEntry[];
  reviews: Record<string, ReviewCard>;
  activity: string[]; // YYYY-MM-DD days with learning activity
  settings: Settings;
  lab: Record<string, unknown>;
  capstone: Record<string, unknown>;
  updatedAt: number;
}

export interface AnswerInput {
  qid: string;
  lesson: string;
  concept: string;
  source: AttemptSource;
  correct: boolean;
  firstTry: boolean;
  mistake?: { question: string; userAnswer: string; correctAnswer: string; why: string };
}

interface Actions {
  visitLesson: (slug: string) => void;
  markLabUsed: (slug: string) => void;
  recordAnswer: (a: AnswerInput) => void;
  submitQuiz: (slug: string, results: { qid: string; correct: boolean }[]) => void;
  reviewAnswer: (qid: string, correct: boolean) => void;
  resolveMistake: (id: string) => void;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  setLab: (key: string, value: unknown) => void;
  setCapstone: (patch: Record<string, unknown>) => void;
  replaceAll: (data: ProgressData) => void;
  reset: () => void;
}

export type ProgressState = ProgressData & Actions;

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const initialProgress = (): ProgressData => ({
  version: 1,
  learnerId: uid("learner"),
  lessons: {},
  attempts: [],
  mistakes: [],
  reviews: {},
  activity: [],
  settings: { socratic: false, theme: "light" },
  lab: {},
  capstone: {},
  updatedAt: Date.now(),
});

const emptyLesson = (): LessonProgress => ({ quizAttempts: 0, exercises: {} });

function touchActivity(activity: string[]) {
  const k = todayKey();
  return activity.includes(k) ? activity : [...activity, k].slice(-400);
}

function scheduleCard(card: ReviewCard | undefined, qid: string, lesson: string, correct: boolean, now = Date.now()): ReviewCard {
  const prev = card ?? { qid, lesson, box: 0, due: now, reviews: 0, lapses: 0 };
  const box = correct ? Math.min(prev.box + 1, REVIEW_INTERVALS.length - 1) : 0;
  const due = correct ? startOfDay(now) + REVIEW_INTERVALS[box] * DAY_MS : startOfDay(now) + (card ? DAY_MS : 0);
  return {
    ...prev,
    box,
    due,
    reviews: prev.reviews + (card ? 1 : 0),
    lapses: prev.lapses + (correct ? 0 : 1),
    lastResult: correct,
    lastReviewed: now,
  };
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialProgress(),

      visitLesson: (slug) =>
        set((s) => {
          const p = s.lessons[slug] ?? emptyLesson();
          const now = Date.now();
          return {
            lessons: { ...s.lessons, [slug]: { ...p, firstOpenedAt: p.firstOpenedAt ?? now, lastVisitedAt: now } },
            updatedAt: now,
          };
        }),

      markLabUsed: (slug) =>
        set((s) => {
          const p = s.lessons[slug] ?? emptyLesson();
          if (p.labUsed) return {};
          return { lessons: { ...s.lessons, [slug]: { ...p, labUsed: true } }, activity: touchActivity(s.activity), updatedAt: Date.now() };
        }),

      recordAnswer: (a) =>
        set((s) => {
          const now = Date.now();
          const attempts = [...s.attempts, { qid: a.qid, lesson: a.lesson, concept: a.concept, source: a.source, correct: a.correct, firstTry: a.firstTry, at: now }].slice(-3000);
          const lessons = { ...s.lessons };
          const p = { ...(lessons[a.lesson] ?? emptyLesson()) };
          if (a.source === "exercise") {
            const prev = p.exercises[a.qid];
            p.exercises = {
              ...p.exercises,
              [a.qid]: {
                correct: (prev?.correct ?? false) || a.correct,
                attempts: (prev?.attempts ?? 0) + 1,
                firstTryCorrect: prev ? prev.firstTryCorrect : a.correct && a.firstTry,
              },
            };
          } else if (a.source === "challenge") {
            const prev = p.challenge;
            p.challenge = {
              correct: (prev?.correct ?? false) || a.correct,
              attempts: (prev?.attempts ?? 0) + 1,
              firstTryCorrect: prev ? prev.firstTryCorrect : a.correct && a.firstTry,
            };
          }
          lessons[a.lesson] = p;

          let mistakes = s.mistakes;
          if (!a.correct && a.mistake) {
            mistakes = [
              {
                id: uid("m"),
                qid: a.qid,
                lesson: a.lesson,
                concept: a.concept,
                source: a.source,
                at: now,
                resolved: false,
                ...a.mistake,
              },
              ...s.mistakes,
            ].slice(0, 500);
          }
          if (a.correct && (a.source === "practice" || a.source === "review")) {
            mistakes = mistakes.map((m) => (m.qid === a.qid && !m.resolved ? { ...m, resolved: true } : m));
          }

          // Wrong answers enter spaced revision immediately ("review today").
          let reviews = s.reviews;
          if (!a.correct && a.source !== "review") {
            reviews = { ...reviews, [a.qid]: { ...(reviews[a.qid] ?? { qid: a.qid, lesson: a.lesson, box: 0, reviews: 0, lapses: 0 }), box: 0, due: startOfDay(now), lastResult: false } };
          }
          return { attempts, lessons, mistakes, reviews, activity: touchActivity(s.activity), updatedAt: now };
        }),

      submitQuiz: (slug, results) =>
        set((s) => {
          const now = Date.now();
          const score = results.length ? results.filter((r) => r.correct).length / results.length : 0;
          const p = { ...(s.lessons[slug] ?? emptyLesson()) };
          p.quizAttempts += 1;
          p.quizLast = score;
          p.quizBest = Math.max(p.quizBest ?? 0, score);
          if (score >= 0.6 && !p.completedAt) p.completedAt = now;
          const reviews = { ...s.reviews };
          for (const r of results) {
            const existing = reviews[r.qid];
            if (!existing) reviews[r.qid] = scheduleCard(undefined, r.qid, slug, r.correct, now);
            else if (!r.correct) reviews[r.qid] = { ...existing, box: 0, due: startOfDay(now), lastResult: false };
          }
          return { lessons: { ...s.lessons, [slug]: p }, reviews, activity: touchActivity(s.activity), updatedAt: now };
        }),

      reviewAnswer: (qid, correct) =>
        set((s) => {
          const card = s.reviews[qid];
          if (!card) return {};
          return {
            reviews: { ...s.reviews, [qid]: scheduleCard(card, qid, card.lesson, correct) },
            activity: touchActivity(s.activity),
            updatedAt: Date.now(),
          };
        }),

      resolveMistake: (id) =>
        set((s) => ({ mistakes: s.mistakes.map((m) => (m.id === id ? { ...m, resolved: true } : m)), updatedAt: Date.now() })),

      setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v }, updatedAt: Date.now() })),

      setLab: (key, value) => set((s) => ({ lab: { ...s.lab, [key]: value }, updatedAt: Date.now() })),

      setCapstone: (patch) => set((s) => ({ capstone: { ...s.capstone, ...patch }, updatedAt: Date.now() })),

      replaceAll: (data) => set(() => ({ ...data })),

      reset: () => set(() => ({ ...initialProgress(), settings: get().settings })),
    }),
    {
      name: "transcript-ai-lab-progress",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { visitLesson, markLabUsed, recordAnswer, submitQuiz, reviewAnswer, resolveMistake, setSetting, setLab, setCapstone, replaceAll, reset, ...data } = s;
        void visitLesson; void markLabUsed; void recordAnswer; void submitQuiz; void reviewAnswer; void resolveMistake; void setSetting; void setLab; void setCapstone; void replaceAll; void reset;
        return data;
      },
    },
  ),
);

/** True once the persisted state has been loaded from localStorage (avoids SSR hydration mismatch). */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const done = () => setHydrated(true);
    if (useProgress.persist.hasHydrated()) done();
    const unsub = useProgress.persist.onFinishHydration(done);
    return () => unsub();
  }, []);
  return hydrated;
}

/** Snapshot of just the data (no actions) — used for export and backend sync. */
export function exportProgress(): ProgressData {
  const s = useProgress.getState();
  const { version, learnerId, lessons, attempts, mistakes, reviews, activity, settings, lab, capstone, updatedAt } = s;
  return { version, learnerId, lessons, attempts, mistakes, reviews, activity, settings, lab, capstone, updatedAt };
}

/** Lab designs (taxonomy, codebook…) persisted across visits. */
export function useLabState<T>(key: string, initial: T): [T, (v: T) => void] {
  const value = useProgress((s) => s.lab[key] as T | undefined);
  const setLab = useProgress((s) => s.setLab);
  const hydrated = useHydrated();
  return [hydrated && value !== undefined ? value : initial, (v: T) => setLab(key, v)];
}
