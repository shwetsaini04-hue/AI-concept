"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Loader2 } from "lucide-react";
import { useProgress } from "@/lib/store/progress";

const loading = () => (
  <div className="flex h-40 items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" /> Loading lab…
  </div>
);

const d = (loader: () => Promise<{ default: ComponentType }>) => dynamic(loader, { ssr: false, loading });

/** One interactive lab per lesson, code-split so heavy labs only load when opened. */
export const LABS: Record<string, ComponentType> = {
  // Module 1 — NLP
  tokenization: d(() => import("./nlp/TokenizationLab")),
  "text-normalization": d(() => import("./nlp/NormalizationLab")),
  "fuzzy-matching": d(() => import("./nlp/FuzzyLab")),
  "phonetic-matching": d(() => import("./nlp/PhoneticLab")),
  "dialogue-structure": d(() => import("./nlp/DialogueLab")),
  "speaker-attribution": d(() => import("./nlp/SpeakerLab")),
  ner: d(() => import("./nlp/NerLab")),
  "text-classification": d(() => import("./nlp/ClassificationLab")),
  // Module 2 — LLM
  "prompt-engineering": d(() => import("./llm/PromptLab")),
  "structured-output": d(() => import("./llm/StructuredOutputLab")),
  "context-engineering": d(() => import("./llm/ContextLab")),
  grounding: d(() => import("./llm/GroundingLab")),
  "llm-judge": d(() => import("./llm/JudgeLab")),
  hallucination: d(() => import("./llm/HallucinationLab")),
  sampling: d(() => import("./llm/SamplingLab")),
  "model-selection": d(() => import("./llm/ModelSelectionLab")),
  "caching-batching": d(() => import("./llm/CachingLab")),
  "pipeline-design": d(() => import("./llm/PipelineLab")),
  "rag-agents": d(() => import("./llm/RagAgentsLab")),
  // Module 3 — Evaluation
  "annotation-guidelines": d(() => import("./eval/GuidelineLab")),
  "inter-annotator-agreement": d(() => import("./eval/AgreementLab")),
  "classification-metrics": d(() => import("./eval/MetricsLab")),
  "macro-micro": d(() => import("./eval/AveragingLab")),
  "class-imbalance": d(() => import("./eval/ImbalanceLab")),
  "gold-set-design": d(() => import("./eval/GoldSetLab")),
  "per-stage-evaluation": d(() => import("./eval/PerStageLab")),
  calibration: d(() => import("./eval/CalibrationLab")),
  "error-analysis": d(() => import("./eval/ErrorAnalysisLab")),
  significance: d(() => import("./eval/SignificanceLab")),
  // Module 4 — IE
  "taxonomy-design": d(() => import("./ie/TaxonomyLab")),
  "open-closed-set": d(() => import("./ie/OpenClosedLab")),
  embeddings: d(() => import("./ie/EmbeddingsLab")),
  clustering: d(() => import("./ie/ClusteringLab")),
};

export function LabHost({ slug }: { slug: string }) {
  const markLabUsed = useProgress((s) => s.markLabUsed);
  const Lab = LABS[slug];
  if (!Lab) return <div className="text-sm text-muted-foreground">No lab registered for this lesson.</div>;
  return (
    <div onPointerDownCapture={() => markLabUsed(slug)} onKeyDownCapture={() => markLabUsed(slug)}>
      <Lab />
    </div>
  );
}
