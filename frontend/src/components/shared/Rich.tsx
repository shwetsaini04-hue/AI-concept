import * as React from "react";
import { GlossaryPopup } from "./GlossaryPopup";
import { cn } from "@/lib/utils";

/**
 * Tiny markup renderer used by all lesson content:
 *   **bold**   `code`   [[glossary-term]]   [[shown text|term-id]]
 * Blank lines separate paragraphs; lines starting with "- " form a list.
 */
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\])/g;

export function RichInline({ text }: { text: string }) {
  const parts = text.split(INLINE);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (p.startsWith("**") && p.endsWith("**"))
          return (
            <strong key={i} className="font-semibold">
              <RichInline text={p.slice(2, -2)} />
            </strong>
          );
        if (p.startsWith("`") && p.endsWith("`"))
          return (
            <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
              {p.slice(1, -1)}
            </code>
          );
        if (p.startsWith("[[") && p.endsWith("]]")) {
          const inner = p.slice(2, -2);
          const [shown, key] = inner.includes("|") ? inner.split("|") : [inner, inner];
          return (
            <GlossaryPopup key={i} termKey={key.trim()}>
              {shown}
            </GlossaryPopup>
          );
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

export function Rich({ text, className }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className={cn("prose-lab space-y-3 text-[15px] leading-relaxed", className)}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>
                  <RichInline text={l.trim().slice(2)} />
                </li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\d+\.\s/.test(l.trim()))) {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>
                  <RichInline text={l.trim().replace(/^\d+\.\s/, "")} />
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            <RichInline text={b.replace(/\n/g, " ")} />
          </p>
        );
      })}
    </div>
  );
}
