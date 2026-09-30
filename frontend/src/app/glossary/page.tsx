"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { GLOSSARY, GLOSSARY_MAP } from "@/content/glossary";
import { MODULES, LESSON_MAP } from "@/content/modules";
import type { ModuleId } from "@/content/types";
import { Badge, Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export default function GlossaryPage() {
  const [q, setQ] = useState("");
  const [mod, setMod] = useState<ModuleId | "all">("all");
  const [hash, setHash] = useState("");
  const fuse = useMemo(() => new Fuse(GLOSSARY, { keys: ["term", "aliases", "simple", "technical"], threshold: 0.35, ignoreLocation: true }), []);

  useEffect(() => {
    const h = () => setHash(window.location.hash.slice(1));
    h();
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hash]);

  const terms = (q.trim() ? fuse.search(q).map((r) => r.item) : [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term))).filter((t) => mod === "all" || t.module === mod);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Glossary</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {GLOSSARY.length} terms, each with a simple definition, a technical definition, an example, why it matters, and related concepts. Terms are clickable throughout the lessons.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setMod("all")} className={cn("cursor-pointer rounded-md border px-3 py-1.5 text-sm", mod === "all" && "border-primary bg-primary-soft text-primary")}>
            All
          </button>
          {MODULES.map((m) => (
            <button key={m.id} onClick={() => setMod(m.id)} className={cn("cursor-pointer rounded-md border px-3 py-1.5 text-sm", mod === m.id && "border-primary bg-primary-soft text-primary")}>
              {m.short}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {terms.map((t) => (
          <article key={t.id} id={t.id} className={cn("scroll-mt-24 rounded-lg border bg-card p-4", hash === t.id && "ring-2 ring-primary")}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{t.term}</h2>
              <Badge variant="muted">{MODULES.find((m) => m.id === t.module)?.short}</Badge>
            </div>
            {t.aliases && t.aliases.length > 0 && <div className="text-xs text-muted-foreground">also: {t.aliases.join(", ")}</div>}
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Simple definition</dt>
                <dd>{t.simple}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Technical definition</dt>
                <dd className="text-foreground/85">{t.technical}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Example</dt>
                <dd className="rounded bg-muted px-2 py-1 font-mono text-xs">{t.example}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why it matters</dt>
                <dd className="text-foreground/85">{t.why}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2">
              {t.related
                .map((r) => GLOSSARY_MAP[r])
                .filter(Boolean)
                .map((r) => (
                  <a key={r.id} href={`#${r.id}`} className="rounded bg-muted px-1.5 py-0.5 text-xs hover:bg-primary-soft hover:text-primary">
                    {r.term}
                  </a>
                ))}
              {t.lesson && LESSON_MAP[t.lesson] && (
                <Link href={`/learn/${t.lesson}`} className="ml-auto text-xs text-primary hover:underline">
                  Lesson: {LESSON_MAP[t.lesson].title} →
                </Link>
              )}
            </div>
          </article>
        ))}
        {terms.length === 0 && <p className="text-sm text-muted-foreground">No terms match “{q}”.</p>}
      </div>
    </div>
  );
}
