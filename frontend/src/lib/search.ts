import Fuse from "fuse.js";
import { ALL_LESSONS, MODULE_MAP } from "@/content/modules";
import { GLOSSARY } from "@/content/glossary";
import { CONCEPTS } from "@/content/concepts";
import { DECISION_TREES } from "@/content/decisions";
import type { MistakeEntry } from "@/lib/store/progress";

export type SearchKind = "Lesson" | "Concept" | "Glossary" | "Exercise" | "Mistake" | "Project" | "Decision" | "Lab";

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  body: string;
  href: string;
}

function buildStatic(): SearchItem[] {
  const items: SearchItem[] = [];
  for (const l of ALL_LESSONS) {
    items.push({
      id: `lesson:${l.slug}`,
      kind: "Lesson",
      title: l.title,
      subtitle: `${MODULE_MAP[l.module].short} · ${l.tagline}`,
      body: `${l.why} ${l.terms.join(" ")}`,
      href: `/learn/${l.slug}`,
    });
    items.push({
      id: `lab:${l.slug}`,
      kind: "Lab",
      title: l.lab.title,
      subtitle: `Interactive lab · ${l.title}`,
      body: l.lab.intro,
      href: `/learn/${l.slug}#lab`,
    });
    l.concepts.forEach((c, i) =>
      items.push({
        id: `concept:${l.slug}:${i}`,
        kind: "Concept",
        title: c.title,
        subtitle: l.title,
        body: `${c.intuition} ${c.technical}`,
        href: `/learn/${l.slug}#concept`,
      }),
    );
    [...l.exercises, l.challenge].forEach((q) =>
      items.push({
        id: `ex:${q.id}`,
        kind: "Exercise",
        title: q.prompt.replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2").replace(/\*\*/g, "").slice(0, 110),
        subtitle: `${l.title} · ${q.difficulty}`,
        body: q.explanation,
        href: `/learn/${l.slug}#${q.id === l.challenge.id ? "challenge" : "exercises"}`,
      }),
    );
  }
  for (const c of CONCEPTS) {
    items.push({ id: `c:${c.id}`, kind: "Concept", title: c.name, subtitle: "Practice set", body: c.mistakeLabel, href: `/practice?concept=${c.id}` });
  }
  for (const t of GLOSSARY) {
    items.push({
      id: `g:${t.id}`,
      kind: "Glossary",
      title: t.term,
      subtitle: t.simple,
      body: `${(t.aliases ?? []).join(" ")} ${t.technical}`,
      href: `/glossary#${t.id}`,
    });
  }
  for (const d of DECISION_TREES) {
    items.push({ id: `d:${d.id}`, kind: "Decision", title: d.title, subtitle: "Decision framework", body: d.description, href: `/decisions#${d.id}` });
  }
  items.push(
    {
      id: "p:capstone",
      kind: "Project",
      title: "Capstone: Transcript Intelligence Pipeline",
      subtitle: "Design taxonomy, guidelines, prompts, schema, evaluation and architecture",
      body: "capstone project final report rubric architecture evaluation",
      href: "/capstone",
    },
    {
      id: "p:dataset",
      kind: "Project",
      title: "Synthetic noisy transcript dataset",
      subtitle: "14 annotated Hinglish / English calls",
      body: "dataset transcripts hinglish asr errors speaker errors",
      href: "/dataset",
    },
    {
      id: "p:system",
      kind: "Project",
      title: "System View: end-to-end architecture",
      subtitle: "Raw call → STT → … → business decision",
      body: "architecture pipeline system view stages",
      href: "/system",
    },
    {
      id: "p:playground",
      kind: "Project",
      title: "Python playground",
      subtitle: "Run pandas / NumPy / scikit-learn in the browser",
      body: "python code sklearn classification_report pandas numpy matplotlib",
      href: "/playground",
    },
  );
  return items;
}

let staticItems: SearchItem[] | null = null;
let staticFuse: Fuse<SearchItem> | null = null;

const FUSE_OPTS = {
  keys: [
    { name: "title", weight: 0.6 },
    { name: "subtitle", weight: 0.25 },
    { name: "body", weight: 0.15 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
};

export function search(query: string, mistakes: MistakeEntry[] = [], limit = 30): SearchItem[] {
  const q = query.trim();
  if (!q) return [];
  if (!staticItems) {
    staticItems = buildStatic();
    staticFuse = new Fuse(staticItems, FUSE_OPTS);
  }
  const mistakeItems: SearchItem[] = mistakes.map((m) => ({
    id: `m:${m.id}`,
    kind: "Mistake",
    title: m.question.replace(/\*\*/g, "").slice(0, 110),
    subtitle: `Your answer: ${m.userAnswer.slice(0, 60)}`,
    body: `${m.why} ${m.concept}`,
    href: "/mistakes",
  }));
  const res = staticFuse!.search(q, { limit: limit * 2 });
  const mres = mistakeItems.length ? new Fuse(mistakeItems, FUSE_OPTS).search(q, { limit: 5 }) : [];
  return [...res, ...mres]
    .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
    .map((r) => r.item)
    .slice(0, limit);
}
