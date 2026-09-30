import type { Lesson } from "../types";
// Module 1 — NLP fundamentals for noisy transcripts
import { tokenization } from "./nlp/tokenization";
import { textNormalization } from "./nlp/text-normalization";
import { fuzzyMatching } from "./nlp/fuzzy-matching";
import { phoneticMatching } from "./nlp/phonetic-matching";
import { dialogueStructure } from "./nlp/dialogue-structure";
import { speakerAttribution } from "./nlp/speaker-attribution";
import { ner } from "./nlp/ner";
import { textClassification } from "./nlp/text-classification";
// Module 2 — LLM engineering
import { promptEngineering } from "./llm/prompt-engineering";
import { structuredOutput } from "./llm/structured-output";
import { contextEngineering } from "./llm/context-engineering";
import { grounding } from "./llm/grounding";
import { llmJudge } from "./llm/llm-judge";
import { hallucination } from "./llm/hallucination";
import { sampling } from "./llm/sampling";
import { modelSelection } from "./llm/model-selection";
import { cachingBatching } from "./llm/caching-batching";
import { pipelineDesign } from "./llm/pipeline-design";
import { ragAgents } from "./llm/rag-agents";
// Module 3 — Evaluation and data labeling
import { annotationGuidelines } from "./eval/annotation-guidelines";
import { interAnnotatorAgreement } from "./eval/inter-annotator-agreement";
import { classificationMetrics } from "./eval/classification-metrics";
import { macroMicro } from "./eval/macro-micro";
import { classImbalance } from "./eval/class-imbalance";
import { goldSetDesign } from "./eval/gold-set-design";
import { perStageEvaluation } from "./eval/per-stage-evaluation";
import { calibration } from "./eval/calibration";
import { errorAnalysis } from "./eval/error-analysis";
import { significance } from "./eval/significance";
// Module 4 — Information extraction and taxonomy
import { taxonomyDesign } from "./ie/taxonomy-design";
import { openClosedSet } from "./ie/open-closed-set";
import { embeddings } from "./ie/embeddings";
import { clustering } from "./ie/clustering";

export const LESSONS: Lesson[] = [
  tokenization,
  textNormalization,
  fuzzyMatching,
  phoneticMatching,
  dialogueStructure,
  speakerAttribution,
  ner,
  textClassification,
  promptEngineering,
  structuredOutput,
  contextEngineering,
  grounding,
  llmJudge,
  hallucination,
  sampling,
  modelSelection,
  cachingBatching,
  pipelineDesign,
  ragAgents,
  annotationGuidelines,
  interAnnotatorAgreement,
  classificationMetrics,
  macroMicro,
  classImbalance,
  goldSetDesign,
  perStageEvaluation,
  calibration,
  errorAnalysis,
  significance,
  taxonomyDesign,
  openClosedSet,
  embeddings,
  clustering,
];
