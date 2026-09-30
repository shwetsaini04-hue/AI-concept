import type { Lesson, ModuleId, ModuleInfo, PipelineStageId, Question, QuestionSource } from "./types";
import { LESSONS } from "./lessons";

export const MODULES: ModuleInfo[] = [
  {
    id: "nlp",
    number: 1,
    title: "NLP Fundamentals for Noisy Transcripts",
    short: "NLP Fundamentals",
    description: "Tokens, normalization, fuzzy & phonetic matching, dialogue structure, speakers, NER and classification — on messy Hinglish call data.",
    color: "sky",
  },
  {
    id: "llm",
    number: 2,
    title: "LLM Engineering",
    short: "LLM Engineering",
    description: "Prompts, structured output, context, grounding, judges, hallucination, sampling, model choice, caching and pipeline architecture.",
    color: "violet",
  },
  {
    id: "eval",
    number: 3,
    title: "Evaluation and Data Labeling",
    short: "Evaluation",
    description: "Guidelines, agreement, metrics, imbalance, gold sets, per-stage evaluation, calibration, error analysis and significance.",
    color: "amber",
  },
  {
    id: "ie",
    number: 4,
    title: "Information Extraction and Taxonomy Design",
    short: "Information Extraction",
    description: "Taxonomies, open vs closed sets, embeddings and clustering for discovering and governing categories.",
    color: "emerald",
  },
];

export const MODULE_MAP = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<ModuleId, ModuleInfo>;

/** Ordered list of every lesson in roadmap order. */
export const ALL_LESSONS: Lesson[] = [...LESSONS].sort((a, b) => {
  const ma = MODULE_MAP[a.module].number;
  const mb = MODULE_MAP[b.module].number;
  return ma - mb || a.order - b.order;
});

export const LESSON_MAP: Record<string, Lesson> = Object.fromEntries(ALL_LESSONS.map((l) => [l.slug, l]));

export const lessonsByModule = (id: ModuleId) => ALL_LESSONS.filter((l) => l.module === id);

export function lessonIndex(slug: string) {
  return ALL_LESSONS.findIndex((l) => l.slug === slug);
}

export interface IndexedQuestion {
  question: Question;
  lesson: string;
  source: QuestionSource;
}

export const QUESTION_INDEX: Record<string, IndexedQuestion> = (() => {
  const idx: Record<string, IndexedQuestion> = {};
  for (const l of ALL_LESSONS) {
    for (const q of l.quiz) idx[q.id] = { question: q, lesson: l.slug, source: "quiz" };
    for (const q of l.exercises) idx[q.id] = { question: q, lesson: l.slug, source: "exercise" };
    idx[l.challenge.id] = { question: l.challenge, lesson: l.slug, source: "challenge" };
  }
  return idx;
})();

export function questionsForConcept(concept: string): IndexedQuestion[] {
  return Object.values(QUESTION_INDEX).filter((q) => q.question.concept === concept);
}

/* --------------------- The end-to-end pipeline --------------------- */

export interface PipelineStage {
  id: PipelineStageId;
  title: string;
  description: string;
  failureModes: string[];
  metrics: string[];
}

export const PIPELINE: PipelineStage[] = [
  {
    id: "call",
    title: "Raw Call",
    description: "Stereo or mono audio of an agent–customer phone call. Often 8 kHz telephony audio with background noise, crosstalk and hold music.",
    failureModes: ["Mono recordings make diarization harder", "Crosstalk and overlaps", "Truncated recordings"],
    metrics: ["Audio duration", "Signal-to-noise estimate", "% calls with both channels"],
  },
  {
    id: "stt",
    title: "Speech-to-Text",
    description: "ASR converts audio into text. Output has substitutions ('loan'→'lone'), deletions, insertions, inconsistent romanization and little punctuation.",
    failureModes: ["Domain words mis-recognized", "Numbers transcribed inconsistently", "Code-switching confuses language models"],
    metrics: ["Word Error Rate (WER)", "Entity/number error rate", "Diarization error rate"],
  },
  {
    id: "transcript",
    title: "Noisy Transcript",
    description: "The text you actually get: Hinglish, Romanized Hindi, repeated words, missing punctuation and uncertain speaker labels.",
    failureModes: ["Unstandardized spellings", "Merged or split turns", "Speaker labels swapped"],
    metrics: ["Token count", "Language mix", "Quality tier"],
  },
  {
    id: "normalization",
    title: "Normalization",
    description: "Canonicalizes surface variation: spelling, romanization, numbers ('five lac' → 500000), abbreviations ('PL' → personal loan).",
    failureModes: ["Destroys negation or emphasis", "Wrong expansion of ambiguous abbreviations", "Number parsing errors ('5-6 lakh')"],
    metrics: ["Normalization accuracy on a labelled sample", "Downstream F1 with vs without each step"],
  },
  {
    id: "speaker",
    title: "Speaker Attribution",
    description: "Assigns each turn to Agent or Customer, from diarization plus textual role cues.",
    failureModes: ["Agent paraphrase attributed to customer", "Back-channels mis-assigned", "Merged turns"],
    metrics: ["Turn-level role accuracy", "Accuracy on evidence-bearing turns"],
  },
  {
    id: "ner",
    title: "NER + Extraction",
    description: "Finds amounts, loan types, rates, tenures, employment type, dates and names.",
    failureModes: ["Competitor rate extracted as offered rate", "Span boundaries inconsistent", "Hinglish numbers missed"],
    metrics: ["Span-level precision/recall/F1 (strict and partial)", "Field-level accuracy"],
  },
  {
    id: "classification",
    title: "Intent Classification",
    description: "Decides interested / not interested / insufficient evidence (and possibly multi-label facts).",
    failureModes: ["Over-inferring interest", "Missing sarcasm", "Forced choice without an abstain class"],
    metrics: ["Per-class precision/recall", "Macro-F1", "Calibration"],
  },
  {
    id: "evidence",
    title: "Evidence Extraction",
    description: "Selects the customer utterance(s) that justify the decision.",
    failureModes: ["Citing agent speech", "Citing non-existent quotes", "Citing a resolved objection"],
    metrics: ["Evidence exact-match / overlap", "Quote existence rate"],
  },
  {
    id: "verification",
    title: "LLM Verification",
    description: "A second check: is the answer entailed by the evidence? Are quotes real? Is the confidence justified?",
    failureModes: ["Correlated errors with the generator", "Judge biases", "Rubber-stamping"],
    metrics: ["Verifier agreement with humans (κ)", "Caught-error rate", "False alarm rate"],
  },
  {
    id: "evaluation",
    title: "Evaluation",
    description: "Gold sets, per-stage metrics, slicing, calibration and significance testing to know if the system works.",
    failureModes: ["Test-set overfitting", "Unrepresentative gold set", "No per-stage attribution"],
    metrics: ["Per-stage and end-to-end metrics with CIs"],
  },
  {
    id: "decision",
    title: "Business Decision",
    description: "Route lead to sales, schedule follow-up, flag compliance, or send to human review.",
    failureModes: ["Acting on low-confidence outputs", "Ignoring cost asymmetry of FP vs FN"],
    metrics: ["Conversion of routed leads", "Review queue precision", "Cost per decision"],
  },
];

export const STAGE_MAP = Object.fromEntries(PIPELINE.map((s) => [s.id, s])) as Record<PipelineStageId, PipelineStage>;

export const lessonsForStage = (stage: PipelineStageId) => ALL_LESSONS.filter((l) => l.stages.includes(stage));
