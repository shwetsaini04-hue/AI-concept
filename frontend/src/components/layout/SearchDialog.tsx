"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { search, type SearchItem, type SearchKind } from "@/lib/search";
import { useProgress } from "@/lib/store/progress";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const KIND_VARIANT: Record<SearchKind, "default" | "info" | "muted" | "warning" | "success" | "danger" | "agent"> = {
  Lesson: "default",
  Concept: "info",
  Glossary: "muted",
  Exercise: "success",
  Mistake: "danger",
  Project: "warning",
  Decision: "agent",
  Lab: "info",
};

const SUGGESTIONS = ["precision", "kappa", "hinglish", "temperature", "lost in the middle", "calibration", "taxonomy", "RAG"];

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const mistakes = useProgress((s) => s.mistakes);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => search(q, mistakes), [q, mistakes]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  function go(item: SearchItem) {
    onOpenChange(false);
    router.push(item.href);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-[10vh] z-50 w-[min(94vw,680px)] -translate-x-1/2 overflow-hidden rounded-xl border bg-popover shadow-2xl">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && results[active]) {
                  go(results[active]);
                }
              }}
              placeholder="Search lessons, concepts, glossary terms, exercises, mistakes, projects…"
              className="h-12 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!q && (
              <div className="p-3">
                <div className="mb-2 text-xs text-muted-foreground">Try:</div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setQ(s)} className="cursor-pointer rounded-md bg-muted px-2 py-1 text-xs hover:bg-primary-soft hover:text-primary">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {q && results.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No results for “{q}”.</div>}
            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => go(r)}
                onMouseEnter={() => setActive(i)}
                className={cn("flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-left", i === active && "bg-muted")}
              >
                <Badge variant={KIND_VARIANT[r.kind]} className="mt-0.5 w-20 justify-center">
                  {r.kind}
                </Badge>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
