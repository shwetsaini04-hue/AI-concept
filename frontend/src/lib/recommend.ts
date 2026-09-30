import { getConcept } from "@/content/concepts";
import { ALL_LESSONS, LESSON_MAP, questionsForConcept } from "@/content/modules";
import type { LessonMastery } from "@/lib/mastery";

export interface RecAction {
  label: string;
  href: string;
}

export interface Recommendation {
  headline: string;
  detail?: string;
  actions: RecAction[];
  tone: "success" | "warning" | "info";
}

/**
 * Next-action recommendation after an exercise, quiz or review (requirement #50).
 * Missed concepts → review the section, practise that concept, compare with its sibling concept.
 */
export function recommendAfter(missedConcepts: string[], currentLesson?: string): Recommendation {
  const unique = [...new Set(missedConcepts)];
  if (!unique.length) {
    const idx = currentLesson ? ALL_LESSONS.findIndex((l) => l.slug === currentLesson) : -1;
    const next = idx >= 0 ? ALL_LESSONS[idx + 1] : undefined;
    const cur = currentLesson ? LESSON_MAP[currentLesson] : undefined;
    const actions: RecAction[] = [];
    if (cur) actions.push({ label: "Try the advanced challenge", href: `/learn/${cur.slug}#challenge` });
    if (next) actions.push({ label: `Continue to ${next.title}`, href: `/learn/${next.slug}` });
    return {
      headline: "Solid — no weak concepts detected here.",
      detail: "Lock it in with the challenge, then move on. This lesson's questions will come back in spaced review.",
      actions,
      tone: "success",
    };
  }
  const primary = getConcept(unique[0]);
  const lesson = LESSON_MAP[primary.lesson];
  const practiceCount = questionsForConcept(primary.id).length;
  const actions: RecAction[] = [];
  if (lesson) actions.push({ label: `Review “${lesson.title}” core concept`, href: `/learn/${lesson.slug}#concept` });
  if (practiceCount > 0)
    actions.push({ label: `Try ${Math.min(practiceCount, 5)} ${primary.name.toLowerCase()} exercises`, href: `/practice?concept=${primary.id}` });
  if (primary.compare) actions.push({ label: primary.compare.label, href: primary.compare.href });
  for (const other of unique.slice(1, 3)) {
    const c = getConcept(other);
    actions.push({ label: `Practise ${c.name.toLowerCase()}`, href: `/practice?concept=${c.id}` });
  }
  return {
    headline: `You struggled with ${primary.name.toLowerCase()}.`,
    detail: unique.length > 1 ? `Also missed: ${unique.slice(1).map((c) => getConcept(c).name).join(", ")}.` : undefined,
    actions,
    tone: "warning",
  };
}

/** Recommended next lesson on the dashboard: first incomplete lesson in roadmap order. */
export function nextLesson(mastery: Record<string, LessonMastery>) {
  const learning = ALL_LESSONS.find((l) => mastery[l.slug]?.status === "learning");
  if (learning) return { lesson: learning, reason: "You started this lesson but haven't passed its quiz yet." };
  const fresh = ALL_LESSONS.find((l) => mastery[l.slug]?.status === "not-started");
  if (fresh) return { lesson: fresh, reason: "Next lesson in the roadmap." };
  const weakest = [...ALL_LESSONS].sort((a, b) => (mastery[a.slug]?.score ?? 0) - (mastery[b.slug]?.score ?? 0))[0];
  return { lesson: weakest, reason: "Everything is complete — this is your lowest-mastery lesson." };
}
