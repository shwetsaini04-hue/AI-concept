"use client";

import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { BookMarked } from "lucide-react";
import { findTerm, GLOSSARY_MAP } from "@/content/glossary";
import { cn } from "@/lib/utils";

/** A clickable technical term that opens a definition popup (requirement #45). */
export function GlossaryPopup({ termKey, children, className }: { termKey: string; children?: React.ReactNode; className?: string }) {
  const term = findTerm(termKey);
  if (!term) return <>{children ?? termKey}</>;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "cursor-help rounded-sm border-b border-dotted border-primary/70 text-inherit hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          {children ?? term.term}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[min(92vw,380px)] rounded-lg border bg-popover p-4 text-sm text-popover-foreground shadow-lg"
        >
          <div className="mb-2 flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-primary" />
            <div className="font-semibold">{term.term}</div>
          </div>
          <div className="space-y-2.5">
            <section>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Simple definition</div>
              <p>{term.simple}</p>
            </section>
            <section>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Technical</div>
              <p className="text-foreground/85">{term.technical}</p>
            </section>
            <section>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why you care</div>
              <p className="text-foreground/85">{term.why}</p>
            </section>
            <section>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Example</div>
              <p className="rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{term.example}</p>
            </section>
            {term.related.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {term.related
                  .map((r) => GLOSSARY_MAP[r])
                  .filter(Boolean)
                  .map((r) => (
                    <Link key={r.id} href={`/glossary#${r.id}`} className="rounded bg-muted px-1.5 py-0.5 text-xs hover:bg-primary-soft hover:text-primary">
                      {r.term}
                    </Link>
                  ))}
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-between border-t pt-2 text-xs">
            <Link href={`/glossary#${term.id}`} className="text-primary hover:underline">
              Open in glossary
            </Link>
            {term.lesson && (
              <Link href={`/learn/${term.lesson}`} className="text-primary hover:underline">
                Go to lesson →
              </Link>
            )}
          </div>
          <Popover.Arrow className="fill-[var(--popover)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
