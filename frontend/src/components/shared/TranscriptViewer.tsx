"use client";

import type { Turn } from "@/content/types";
import { cn } from "@/lib/utils";

export function SpeakerTag({ speaker, className }: { speaker: string; className?: string }) {
  const s = speaker.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex w-[76px] shrink-0 justify-center rounded px-1.5 py-0.5 text-[11px] font-semibold",
        s === "agent" ? "bg-agent-soft text-agent" : s === "customer" ? "bg-customer-soft text-customer" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {speaker}
    </span>
  );
}

/**
 * Renders a transcript as turns. Optional selection mode lets the learner
 * pick evidence turns; optional `highlight` marks turns (e.g. revealed evidence).
 */
export function TranscriptViewer({
  turns,
  selectable = false,
  selected = [],
  onToggle,
  highlight = [],
  highlightTone = "success",
  numbered = true,
  className,
  renderExtra,
}: {
  turns: Turn[];
  selectable?: boolean;
  selected?: number[];
  onToggle?: (i: number) => void;
  highlight?: number[];
  highlightTone?: "success" | "warning" | "danger";
  numbered?: boolean;
  className?: string;
  renderExtra?: (i: number) => React.ReactNode;
}) {
  const ring = { success: "ring-success bg-success-soft", warning: "ring-warning bg-warning-soft", danger: "ring-danger bg-danger-soft" }[highlightTone];
  return (
    <div className={cn("space-y-1.5 rounded-lg border bg-subtle p-3 font-mono text-[13px]", className)}>
      {turns.map((t, i) => {
        const isSel = selected.includes(i);
        const isHi = highlight.includes(i);
        const Comp = selectable ? "button" : "div";
        return (
          <Comp
            key={i}
            type={selectable ? "button" : undefined}
            onClick={selectable ? () => onToggle?.(i) : undefined}
            className={cn(
              "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
              selectable && "cursor-pointer hover:bg-muted",
              isSel && "bg-primary-soft ring-1 ring-primary",
              isHi && cn("ring-1", ring),
            )}
            aria-pressed={selectable ? isSel : undefined}
          >
            {numbered && <span className="w-5 shrink-0 pt-0.5 text-right text-[11px] text-muted-foreground">{i + 1}</span>}
            <SpeakerTag speaker={t.speaker} />
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{t.text}</span>
            {renderExtra?.(i)}
          </Comp>
        );
      })}
    </div>
  );
}
