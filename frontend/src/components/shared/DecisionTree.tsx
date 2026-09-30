"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, RotateCcw, Undo2, CheckCircle2, AlertTriangle, OctagonX } from "lucide-react";
import type { DecisionLeaf, DecisionTree as Tree } from "@/content/decisions";
import { LESSON_MAP } from "@/content/modules";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface Step {
  nodeId: string;
  choice: string;
}

export function DecisionTree({ tree, className }: { tree: Tree; className?: string }) {
  const [path, setPath] = useState<Step[]>([]);
  const [current, setCurrent] = useState<string>(tree.start);
  const [leaf, setLeaf] = useState<DecisionLeaf | null>(null);

  const node = tree.nodes[current];

  function choose(label: string, next?: string, l?: DecisionLeaf) {
    setPath((p) => [...p, { nodeId: current, choice: label }]);
    if (l) setLeaf(l);
    else if (next) setCurrent(next);
  }

  function back() {
    const last = path[path.length - 1];
    if (!last) return;
    setPath((p) => p.slice(0, -1));
    setLeaf(null);
    setCurrent(last.nodeId);
  }

  function reset() {
    setPath([]);
    setLeaf(null);
    setCurrent(tree.start);
  }

  const toneCls = leaf && { go: "border-success/40 bg-success-soft", caution: "border-warning/40 bg-warning-soft", stop: "border-danger/40 bg-danger-soft" }[leaf.tone];
  const ToneIcon = leaf ? { go: CheckCircle2, caution: AlertTriangle, stop: OctagonX }[leaf.tone] : null;

  return (
    <div className={cn("space-y-3", className)}>
      {path.length > 0 && (
        <ol className="space-y-1 text-sm">
          {path.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-1 text-muted-foreground">
              <span className="font-mono text-xs">{i + 1}.</span>
              <span>{tree.nodes[s.nodeId].question}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">{s.choice}</span>
            </li>
          ))}
        </ol>
      )}

      {!leaf && node && (
        <div className="rounded-lg border bg-card p-4">
          <div className="font-medium">{node.question}</div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground/80">Why this question matters: </span>
            {node.why}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {node.options.map((o) => (
              <Button key={o.label} variant="outline" className="h-auto justify-start whitespace-normal py-2 text-left" onClick={() => choose(o.label, o.next, o.leaf)}>
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {leaf && ToneIcon && (
        <div className={cn("rounded-lg border p-4", toneCls)}>
          <div className="flex items-center gap-2 font-semibold">
            <ToneIcon className="h-5 w-5" />
            {leaf.verdict}
          </div>
          <p className="mt-2 text-sm">{leaf.reasoning}</p>
          {leaf.caveats.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-foreground/80">
              {leaf.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          {leaf.lessons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {leaf.lessons
                .map((s) => LESSON_MAP[s])
                .filter(Boolean)
                .map((l) => (
                  <Link key={l.slug} href={`/learn/${l.slug}`} className="rounded-md bg-card px-2 py-1 text-primary hover:underline">
                    {l.title} →
                  </Link>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={back} disabled={!path.length}>
          <Undo2 /> Back
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} disabled={!path.length}>
          <RotateCcw /> Restart
        </Button>
      </div>
    </div>
  );
}
