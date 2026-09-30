import { Cpu, FlaskConical, Database, Radio, Calculator } from "lucide-react";
import type { LabMode } from "@/content/types";
import { Tip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Honesty labels (requirement #37): the learner must always know whether a
 * result came from a real model call, a real model running locally, a
 * simulation, a precomputed example, or a deterministic computation.
 */
const MODES: Record<LabMode, { label: string; cls: string; icon: typeof Cpu; tip: string }> = {
  "real-model": {
    label: "REAL MODEL CALL",
    cls: "bg-success-soft text-success border-success/30",
    icon: Radio,
    tip: "This output came from a live request to a real LLM provider through the backend.",
  },
  "real-local": {
    label: "REAL MODEL · IN BROWSER",
    cls: "bg-info-soft text-info border-info/30",
    icon: Cpu,
    tip: "A real model or real tokenizer running locally in your browser (no API call).",
  },
  simulated: {
    label: "SIMULATED MODEL",
    cls: "bg-warning-soft text-warning border-warning/30",
    icon: FlaskConical,
    tip: "Rule-based simulation designed to illustrate a behaviour. It is NOT an LLM output.",
  },
  precomputed: {
    label: "PRECOMPUTED EXAMPLE",
    cls: "bg-muted text-muted-foreground border-border",
    icon: Database,
    tip: "A fixed, hand-authored or previously computed example. It does not change with your input.",
  },
  computed: {
    label: "LIVE COMPUTATION",
    cls: "bg-primary-soft text-primary border-primary/30",
    icon: Calculator,
    tip: "A real algorithm (metric, distance, statistic…) computed on your input right now.",
  },
};

export function ModeBadge({ mode, className, detail }: { mode: LabMode; className?: string; detail?: string }) {
  const m = MODES[mode];
  const Icon = m.icon;
  return (
    <Tip content={<span>{m.tip}{detail ? <><br /><span className="text-muted-foreground">{detail}</span></> : null}</span>}>
      <span className={cn("inline-flex cursor-help items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide", m.cls, className)}>
        <Icon className="h-3 w-3" />
        {m.label}
      </span>
    </Tip>
  );
}
