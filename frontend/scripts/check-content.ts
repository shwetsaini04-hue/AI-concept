/**
 * Content integrity checks for all lessons. Run: npm run check:content
 *  - structure (≥3 exercises, ≥5 quiz questions, challenge, 10 questions answered)
 *  - unique question ids, valid concept tags, glossary terms, related lessons, lab registration
 *  - every question's reference answer passes the same grader learners use
 */
import { LESSONS } from "../src/content/lessons/index";
import { CONCEPT_MAP } from "../src/content/concepts";
import { GLOSSARY_MAP, findTerm } from "../src/content/glossary";
import { grade, type AnswerValue } from "../src/lib/grading";
import type { Question } from "../src/content/types";
import { readFileSync } from "node:fs";

const labHost = readFileSync(new URL("../src/components/labs/LabHost.tsx", import.meta.url), "utf8");
const errors: string[] = [];
const warn: string[] = [];
const ids = new Set<string>();
const slugs = new Set(LESSONS.map((l) => l.slug));

function referenceAnswer(q: Question): AnswerValue {
  switch (q.kind) {
    case "mcq":
      return { kind: "mcq", index: q.options.findIndex((o) => o.correct) };
    case "multi":
      return { kind: "multi", indices: q.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0) };
    case "numeric":
      return { kind: "numeric", value: q.answer };
    case "text":
      return { kind: "text", value: q.modelAnswer };
    case "json":
      return { kind: "json", value: q.modelAnswer };
    case "evidence":
      return { kind: "evidence", verdict: q.correctVerdict, turns: q.evidenceTurns };
    case "label":
      return { kind: "label", values: q.items.map((i) => i.answer) };
  }
}

for (const l of LESSONS) {
  const where = `[${l.slug}]`;
  if (l.exercises.length < 3) errors.push(`${where} has ${l.exercises.length} exercises (< 3)`);
  if (l.quiz.length < 5) errors.push(`${where} has ${l.quiz.length} quiz questions (< 5)`);
  if (l.mistakes.length < 3) errors.push(`${where} has ${l.mistakes.length} common mistakes (< 3)`);
  if (!l.concepts.length) errors.push(`${where} has no concepts`);
  for (const [k, v] of Object.entries(l.questions)) if (!v || v.length < 20) errors.push(`${where} 10-questions field '${k}' is too short`);
  if (!labHost.includes(`"${l.lab.id}"`) && !labHost.includes(`${l.lab.id}:`)) errors.push(`${where} lab '${l.lab.id}' not registered in LabHost`);
  for (const r of l.related) if (!slugs.has(r)) errors.push(`${where} related lesson '${r}' does not exist`);
  for (const t of l.terms) if (!GLOSSARY_MAP[t]) errors.push(`${where} glossary term '${t}' does not exist`);
  const types = new Set(l.exercises.map((e) => e.exType));
  for (const t of ["conceptual", "applied", "engineering"]) if (!types.has(t as never)) warn.push(`${where} exercises have no Type ${t}`);

  // inline [[term]] references in prose
  const prose = [l.why, l.realWorld.text, ...l.concepts.flatMap((c) => [c.technical, c.intuition, c.example])].join("\n");
  for (const m of prose.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const inner = m[1];
    const key = inner.includes("|") ? inner.split("|")[1] : inner;
    if (!findTerm(key.trim())) warn.push(`${where} [[${inner}]] does not resolve to a glossary term (renders as plain text)`);
  }

  for (const [source, qs] of [
    ["exercise", l.exercises],
    ["quiz", l.quiz],
    ["challenge", [l.challenge]],
  ] as const) {
    for (const q of qs) {
      const w = `${where} ${source} ${q.id}`;
      if (ids.has(q.id)) errors.push(`${w} duplicate id`);
      ids.add(q.id);
      if (!CONCEPT_MAP[q.concept]) errors.push(`${w} unknown concept '${q.concept}'`);
      if (q.kind === "mcq" && q.options.filter((o) => o.correct).length !== 1) errors.push(`${w} MCQ must have exactly one correct option`);
      if (q.kind === "multi" && !q.options.some((o) => o.correct)) errors.push(`${w} multi has no correct option`);
      if (q.kind === "label" && q.items.some((i) => !q.labels.includes(i.answer))) errors.push(`${w} label answer not in label set`);
      if (q.kind === "evidence") {
        if (!q.verdicts.includes(q.correctVerdict)) errors.push(`${w} correct verdict not among verdicts`);
        if (q.evidenceTurns.some((t) => t < 0 || t >= q.transcript.length)) errors.push(`${w} evidence turn out of range`);
      }
      const r = grade(q, referenceAnswer(q));
      if (!r.correct) errors.push(`${w} reference answer FAILS its own grader: ${r.why}`);
    }
  }
}

console.log(`Checked ${LESSONS.length} lessons, ${ids.size} questions.`);
if (warn.length) console.log(`\n${warn.length} warning(s):\n  ${warn.join("\n  ")}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log("\nAll content checks passed.");
