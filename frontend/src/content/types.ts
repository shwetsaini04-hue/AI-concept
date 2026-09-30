/* ------------------------------------------------------------------ */
/*  Core content model. Everything the learner sees is typed here so  */
/*  lessons, the dashboard, search and the mistake/revision engines    */
/*  all read from the same source of truth.                           */
/* ------------------------------------------------------------------ */

export type ModuleId = "nlp" | "llm" | "eval" | "ie";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type ExerciseType = "conceptual" | "applied" | "engineering";

export type PipelineStageId =
  | "call"
  | "stt"
  | "transcript"
  | "normalization"
  | "speaker"
  | "ner"
  | "classification"
  | "evidence"
  | "verification"
  | "evaluation"
  | "decision";

export type Speaker = "Agent" | "Customer";

export interface Turn {
  speaker: Speaker | "?";
  text: string;
}

/** Technical explanation + simple intuition + concrete example (requirement #51). */
export interface TriLayer {
  title: string;
  technical: string;
  intuition: string;
  example: string;
}

/** The ten questions every important concept must answer (requirement #2). */
export interface ConceptQuestions {
  what: string;
  why: string;
  problem: string;
  how: string;
  onRealData: string;
  whatCanGoWrong: string;
  howToEvaluate: string;
  whenToUse: string;
  whenNotToUse: string;
  downstream: string;
}

export interface CommonMistake {
  mistake: string;
  why: string;
  fix: string;
}

export interface Tradeoff {
  a: string;
  b: string;
  note: string;
}

export interface EngineeringDecision {
  question: string;
  useWhen: string[];
  avoidWhen: string[];
  tradeoffs: Tradeoff[];
}

/* ----------------------------- Questions ---------------------------- */

interface BaseQuestion {
  id: string;
  prompt: string;
  concept: string; // ConceptId from concepts.ts
  difficulty: Difficulty;
  exType?: ExerciseType;
  hint: string;
  explanation: string;
  /** Optional transcript shown above the prompt. */
  transcript?: Turn[];
}

export interface Option {
  text: string;
  correct?: boolean;
  /** Shown when the learner picks this wrong option; also stored in the mistake DB. */
  whyWrong?: string;
}

export interface MCQQuestion extends BaseQuestion {
  kind: "mcq";
  options: Option[];
}

export interface MultiQuestion extends BaseQuestion {
  kind: "multi";
  options: Option[];
}

export interface NumericQuestion extends BaseQuestion {
  kind: "numeric";
  answer: number;
  tolerance: number;
  unit?: string;
}

export interface RubricIdea {
  idea: string;
  keywords: string[];
}

/** Free text graded by a transparent keyword rubric (not an LLM). */
export interface TextQuestion extends BaseQuestion {
  kind: "text";
  rubric: RubricIdea[];
  minIdeas: number;
  modelAnswer: string;
}

export interface JsonCheck {
  label: string;
  test: (value: any) => boolean;
}

/** JSON authored by the learner and validated by explicit checks. */
export interface JsonQuestion extends BaseQuestion {
  kind: "json";
  starter: string;
  checks: JsonCheck[];
  modelAnswer: string;
}

/** Pick a verdict and select the evidence turns in a transcript. */
export interface EvidenceQuestion extends BaseQuestion {
  kind: "evidence";
  transcript: Turn[];
  claim: string;
  verdicts: string[];
  correctVerdict: string;
  evidenceTurns: number[];
}

/** Assign a label to each item (dialogue acts, speakers, intents…). */
export interface LabelQuestion extends BaseQuestion {
  kind: "label";
  labels: string[];
  items: { text: string; speaker?: string; answer: string; note?: string }[];
  /** Fraction of items that must be correct to pass. */
  passThreshold: number;
}

export type Question =
  | MCQQuestion
  | MultiQuestion
  | NumericQuestion
  | TextQuestion
  | JsonQuestion
  | EvidenceQuestion
  | LabelQuestion;

export type QuestionSource = "quiz" | "exercise" | "challenge";

/* ------------------------------ Lessons ----------------------------- */

export type LabMode = "real-model" | "real-local" | "simulated" | "precomputed" | "computed";

export interface LabSpec {
  id: string;
  title: string;
  intro: string;
  modes: LabMode[];
}

export interface CodeSnippet {
  title: string;
  code: string;
  note?: string;
}

export interface Lesson {
  slug: string;
  module: ModuleId;
  order: number;
  title: string;
  tagline: string;
  difficulty: Difficulty;
  minutes: number;
  stages: PipelineStageId[];
  why: string;
  concepts: TriLayer[];
  questions: ConceptQuestions;
  lab: LabSpec;
  realWorld: { text: string; transcript?: Turn[] };
  mistakes: CommonMistake[];
  decision: EngineeringDecision;
  exercises: Question[];
  quiz: Question[];
  challenge: Question;
  code?: CodeSnippet;
  related: string[];
  terms: string[];
}

export interface ModuleInfo {
  id: ModuleId;
  number: number;
  title: string;
  short: string;
  description: string;
  color: string; // tailwind text/bg token base, e.g. "sky"
}

/* ------------------------------ Glossary ---------------------------- */

export interface GlossaryTerm {
  id: string;
  term: string;
  aliases?: string[];
  simple: string;
  technical: string;
  example: string;
  why: string;
  related: string[];
  module: ModuleId;
  lesson?: string;
}
