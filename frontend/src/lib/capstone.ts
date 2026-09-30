/**
 * Capstone: state shape, reference data and the VISIBLE rubric (requirement #36/#54).
 * Every point is computed from the learner's artifacts by transparent checks.
 */
import { DATASET, type Conversation } from "@/content/dataset";
import { cohenKappa } from "@/lib/metrics/agreement";
import { multiClassReport, confusion } from "@/lib/metrics/classification";
import { validateJson } from "@/lib/llm/schema";
import type { PromptConfig } from "@/lib/llm/promptSim";

export const CAP_CONV_IDS = ["c01", "c02", "c03", "c04", "c05", "c08", "c13", "c14"];
export const CAP_CONVS: Conversation[] = CAP_CONV_IDS.map((id) => DATASET.find((c) => c.id === id)!);
export const CANON = ["interested", "not_interested", "insufficient_evidence"] as const;

export interface CapLabel {
  intent: string;
  amount: string; // raw input; blank = null
  evidence: number[];
}

export interface CapState {
  taxonomy: { intents: string; objections: string; separateFields: boolean };
  guidelines: { defs: Record<string, string>; rulings: Record<string, string> };
  labels: Record<string, CapLabel>;
  prompt: PromptConfig;
  promptRun: { acc: number; macroF1: number; evidence: number; format: number; mode: "simulated" | "real-model"; at: number } | null;
  schema: string;
  evalDesign: { metric: string; size: string; stratify: string; splits: string; testUse: string; iaa: string; perStage: boolean; calibration: boolean };
  errors: { rootCause: string; priority: string; fix: string };
  compare: { significant: string; ship: string; why: string };
  arch: Record<string, string>;
  summary: string;
  lastScore?: number;
}

export const EDGE_CASES = [
  { id: "third-party", text: "“I don't need it, but my brother might.”" },
  { id: "callback", text: "“Driving now, call me at 6.”" },
  { id: "sarcasm", text: "“Wow 18%, amazing, I'll definitely take it… just kidding.”" },
  { id: "agent-paraphrase", text: "Agent: “So you want 5 lakh, right?” Customer: “hmm”" },
  { id: "resolved-objection", text: "“EMI too high… ok, 5 years then, process it.”" },
];

export const DEFAULT_SCHEMA = `{
  "type": "object",
  "required": [],
  "properties": {
    "intent": { "type": "string" }
  }
}`;

export const ARCH_DECISIONS: { id: string; question: string; options: { v: string; label: string; pts: number; why: string }[] }[] = [
  {
    id: "preprocessing",
    question: "Preprocessing",
    options: [
      { v: "none", label: "None — send raw ASR text", pts: 0.5, why: "Workable with strong models, but numbers/spellings stay inconsistent for extraction." },
      { v: "aggressive", label: "Aggressive: lowercase, strip punctuation, remove stop-words", pts: 0, why: "Destroys negation ('nahi'), decimals and question marks." },
      { v: "conservative", label: "Conservative normalization (numbers, spellings) + keep original text for evidence", pts: 2, why: "Normalizes what code can do exactly; evidence quotes still come from the original." },
    ],
  },
  {
    id: "labeling",
    question: "Labeling strategy",
    options: [
      { v: "llm-only", label: "LLM labels only, no humans", pts: 0, why: "Circular: you'd evaluate a model with labels from a similar model." },
      { v: "single", label: "One human annotator labels everything", pts: 0.5, why: "No agreement measurement; guideline ambiguity stays invisible." },
      { v: "double", label: "Guidelines + 2 annotators on a sample, κ measured, disagreements adjudicated", pts: 1, why: "Measures and improves label reliability." },
    ],
  },
  {
    id: "prompt",
    question: "Prompt architecture",
    options: [
      { v: "giant", label: "One giant prompt with every document and all history", pts: 0, why: "Prompt bloat, cost, and lost-in-the-middle risk." },
      { v: "cached", label: "Static rulebook + examples as cached prefix, transcript after, JSON schema, evidence rules", pts: 2, why: "Cacheable, grounded, structured." },
      { v: "chain6", label: "A chain of six LLM calls, one per field", pts: 0.5, why: "Decomposition without evidence of need — cost and error compounding." },
    ],
  },
  {
    id: "model",
    question: "Model choice",
    options: [
      { v: "largest", label: "Largest model for every call", pts: 1, why: "Quality-first but ignores cost; justifiable only for low volume." },
      { v: "routed", label: "Small model by default; route ambiguous / low-confidence calls to a larger model", pts: 2, why: "Spends quality where it matters; needs a validated router." },
      { v: "tiny-local", label: "Tiny local model everywhere", pts: 0, why: "Only if data residency forces it — and then invest heavily in evaluation." },
    ],
  },
  {
    id: "pipeline",
    question: "Pipeline architecture",
    options: [
      { v: "single", label: "Single LLM call", pts: 1, why: "Simple and cheap; per-stage debugging is harder." },
      { v: "staged", label: "Normalize → extract → classify with evidence → verify", pts: 2, why: "Each stage is measurable; verification catches unsupported outputs." },
      { v: "agent", label: "Autonomous agent with tools", pts: 0, why: "The steps are known in advance — an agent adds nondeterminism for no benefit." },
    ],
  },
  {
    id: "errors",
    question: "Error handling",
    options: [
      { v: "retry-forever", label: "Retry until the JSON is valid", pts: 0, why: "Unbounded cost/latency; hides systematic failures." },
      { v: "validate", label: "Validate against schema, one retry, then route to review queue and log", pts: 2, why: "Bounded, observable, safe." },
      { v: "ignore", label: "Drop invalid outputs silently", pts: 0, why: "Biases metrics and loses calls." },
    ],
  },
  {
    id: "confidence",
    question: "Confidence strategy",
    options: [
      { v: "verbal", label: "Ask the LLM to state its confidence (0–1)", pts: 0.5, why: "Verbalized confidence is often poorly calibrated." },
      { v: "calibrated", label: "Derive confidence (e.g. sample agreement / log-probs), check a reliability diagram on the gold set", pts: 2, why: "Measured and validated." },
      { v: "fixed", label: "Always 0.9", pts: 0, why: "Carries no information." },
    ],
  },
  {
    id: "review",
    question: "Human review strategy",
    options: [
      { v: "all", label: "Humans review everything", pts: 0.5, why: "Safe but defeats the purpose at scale." },
      { v: "targeted", label: "Review low-confidence + needs_review flags + a random 2% audit", pts: 1, why: "Targets risk and keeps measuring quality in production." },
      { v: "none", label: "No human review", pts: 0, why: "No way to detect drift or catch costly errors." },
    ],
  },
];

export const PILOT = {
  overall: 0.79,
  language: { English: 0.9, Hinglish: 0.8, "Romanized Hindi": 0.61 },
  quality: { clean: 0.88, noisy: 0.74, "very noisy": 0.55 },
  agent: { "Agent A": 0.86, "Agent B": 0.7, "Agent C": 0.8 },
  cross: { "Agent A": { clean: 0.88, noisy: 0.75 }, "Agent B": { clean: 0.87, noisy: 0.72 }, "Agent C": { clean: 0.89, noisy: 0.74 } } as Record<string, Record<string, number>>,
  traffic: { clean: 0.55, noisy: 0.3, "very noisy": 0.15 },
};

export const COMPARE = {
  A: { name: "A: single LLM call", acc: 0.81, macroF1: 0.76, cost: 2.1, p95: 1.8 },
  B: { name: "B: staged pipeline with verification", acc: 0.85, macroF1: 0.82, cost: 5.4, p95: 4.9 },
  n: 400,
  b: 18, // A right, B wrong
  c: 34, // A wrong, B right
};

export function initialCapstone(bad: PromptConfig): CapState {
  return {
    taxonomy: { intents: "Interested\nNot Interested", objections: "Rate\nDocuments", separateFields: false },
    guidelines: { defs: {}, rulings: {} },
    labels: {},
    prompt: bad,
    promptRun: null,
    schema: DEFAULT_SCHEMA,
    evalDesign: { metric: "", size: "", stratify: "", splits: "", testUse: "", iaa: "", perStage: false, calibration: false },
    errors: { rootCause: "", priority: "", fix: "" },
    compare: { significant: "", ship: "", why: "" },
    arch: {},
    summary: "",
  };
}

/* ------------------------------ Scoring ------------------------------ */

export interface Check {
  label: string;
  pts: number;
  earned: number;
}
export interface Criterion {
  name: string;
  max: number;
  checks: Check[];
  earned: number;
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const chk = (label: string, pts: number, frac: number | boolean): Check => ({ label, pts, earned: Math.round(pts * Math.max(0, Math.min(1, typeof frac === "boolean" ? (frac ? 1 : 0) : frac)) * 10) / 10 });

export function parseAmount(s: string): number | null {
  const t = s.replace(/[,\s₹]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function scoreCapstone(s: CapState): { total: number; criteria: Criterion[] } {
  const intents = lines(s.taxonomy.intents);
  const objections = lines(s.taxonomy.objections);
  const mixed = intents.filter((l) => /loan|card|existing|customer|callback|follow|rate|document/i.test(l)).length;

  const taxonomy: Check[] = [
    chk("Intent set includes an abstain label (insufficient evidence / unknown)", 3, intents.some((l) => /insufficient|unknown|unclear|abstain/i.test(l))),
    chk("Intent labels stay on one dimension (no product/status/action labels mixed in)", 3, intents.length >= 2 && mixed === 0),
    chk("Objection set has 3–8 categories", 2, objections.length >= 3 && objections.length <= 8),
    chk("Objection set includes “Other”", 2, objections.some((l) => /other/i.test(l))),
    chk("Product, intent and objections are separate output fields", 2, s.taxonomy.separateFields),
  ];

  // Labels
  const labelled = CAP_CONVS.filter((c) => s.labels[c.id]?.intent);
  const intentKappa = labelled.length >= 4 ? cohenKappa(labelled.map((c) => s.labels[c.id].intent), labelled.map((c) => c.gold.intent), [...CANON]).kappa : 0;
  const amountAcc = CAP_CONVS.filter((c) => {
    const l = s.labels[c.id];
    if (!l) return false;
    return parseAmount(l.amount) === c.gold.amount;
  }).length / CAP_CONVS.length;
  const evidenceAcc =
    CAP_CONVS.filter((c) => {
      const l = s.labels[c.id];
      if (!l || !l.evidence.length) return false;
      const hit = l.evidence.filter((t) => c.gold.evidenceTurns.includes(t)).length;
      const agentCited = l.evidence.some((t) => c.turns[t].speaker === "Agent");
      return hit > 0 && hit / l.evidence.length >= 0.5 && !agentCited;
    }).length / CAP_CONVS.length;

  // Prompt
  const p = s.prompt;
  const all = `${p.system}\n${p.task}\n${p.constraints}\n${p.outputFormat}`.toLowerCase();
  const run = s.promptRun;
  const prompt: Check[] = [
    chk("Requires JSON output", 2, /json/.test(all)),
    chk("Lists the exact label enum", 2, /interested/.test(all) && /not_interested/.test(all) && /insufficient_evidence/.test(all)),
    chk("Allows abstaining (insufficient evidence, don't guess)", 2, /insufficient|do not guess|don't guess/.test(all)),
    chk("Evidence must be customer speech", 2, /evidence|quote/.test(all) && /(only|never).{0,60}(customer|agent)/.test(all)),
    chk("Evidence quoted verbatim", 1, /verbatim/.test(all)),
    chk("Handles final stance / resolved objections / sarcasm", 2, /final|resolved|sarcas/.test(all)),
    chk("≥ 2 few-shot examples, not all positive", 1, p.examples.length >= 2 && p.examples.some((e) => e !== "ex-clean")),
    chk("Test-set accuracy ≥ 80% on a recorded run", 2, run ? run.acc >= 0.8 : false),
  ];

  // Schema
  let schemaChecks: Check[] = [];
  const v = validateJson(s.schema, "{}");
  let schemaObj: Record<string, unknown> | null = null;
  try {
    schemaObj = JSON.parse(s.schema);
  } catch {
    schemaObj = null;
  }
  const props = (schemaObj?.properties ?? {}) as Record<string, Record<string, unknown>>;
  const req = (schemaObj?.required ?? []) as string[];
  const ent = (props.entities?.properties ?? {}) as Record<string, Record<string, unknown>>;
  const typeIncludes = (x: Record<string, unknown> | undefined, t: string) => !!x && (x.type === t || (Array.isArray(x.type) && (x.type as string[]).includes(t)));
  schemaChecks = [
    chk("Schema compiles", 1, !v.schemaError),
    chk("Requires intent, evidence, confidence, reason, needs_review", 2, ["intent", "evidence", "confidence", "reason", "needs_review"].every((k) => req.includes(k))),
    chk("intent is an enum", 1, Array.isArray(props.intent?.enum)),
    chk("confidence is a number in [0, 1]", 1, typeIncludes(props.confidence, "number") && props.confidence?.minimum === 0 && props.confidence?.maximum === 1),
    chk("entities.amount is integer (or null)", 1, typeIncludes(ent.amount, "integer")),
  ];

  // Classification metrics
  const primaryOk = ["macro-f1", "per-class"].includes(s.evalDesign.metric);
  const classification: Check[] = [chk("Recorded prompt run: macro-F1 (scaled)", 8, run ? run.macroF1 : 0), chk("Primary metric suits imbalanced, multi-class intent (macro-F1 / per-class P&R)", 4, primaryOk)];

  const evidence: Check[] = [chk("Your labelled evidence overlaps the gold evidence, no agent turns cited", 6, evidenceAcc), chk("Prompt run cites verbatim customer evidence", 6, run ? run.evidence : 0)];

  const extraction: Check[] = [chk("Amounts normalized correctly in your labels (₹, integer, null when absent)", 6, amountAcc), ...schemaChecks];

  // Evaluation methodology
  const defsDone = intents.filter((l) => (s.guidelines.defs[l] ?? "").trim().split(/\s+/).length >= 6).length / Math.max(1, intents.length);
  const rulings = EDGE_CASES.filter((e) => (s.guidelines.rulings[e.id] ?? "").trim().length > 8).length / EDGE_CASES.length;
  const d = s.evalDesign;
  const goldOk = (d.size === "300" || d.size === "1000") && d.stratify === "language-quality" && d.splits === "train-dev-test" && d.testUse === "final-only";
  const evalM: Check[] = [
    chk("Guidelines: definitions (≥ 6 words) for every intent label", 1.5, defsDone),
    chk("Guidelines: rulings for the 5 edge cases", 1.5, rulings),
    chk("Your labels agree with the reference (Cohen's κ, scaled)", 3, intentKappa),
    chk("Gold set: ≥ 300 calls, stratified by language & quality, train/dev/test, test touched once", 3, goldOk),
    chk("Inter-annotator agreement measured on a double-labelled sample", 1, d.iaa === "double"),
    chk("Per-stage evaluation planned", 1, d.perStage),
    chk("Calibration check planned", 1, d.calibration),
    chk("Correct significance call on A vs B (paired McNemar, p ≈ 0.04)", 2, s.compare.significant === "yes"),
  ];

  const errors: Check[] = [
    chk("Root cause: transcript quality (Agent B is a confounder)", 4, s.errors.rootCause === "quality"),
    chk("Prioritize noisy/very-noisy transcripts (45% of traffic, lowest F1)", 3, s.errors.priority === "noisy"),
    chk(
      "Fix plan mentions concrete, measurable actions",
      3,
      Math.min(1, ["normaliz", "asr", "few-shot", "example", "route", "review", "re-evaluat", "slice", "noisy"].filter((k) => s.errors.fix.toLowerCase().includes(k)).length / 3),
    ),
  ];

  const archChecks: Check[] = ARCH_DECISIONS.map((a) => {
    const max = Math.max(...a.options.map((o) => o.pts));
    const got = a.options.find((o) => o.v === s.arch[a.id])?.pts ?? 0;
    return { label: a.question, pts: max, earned: got };
  });

  const criteria: Criterion[] = [
    { name: "Taxonomy", max: 12, checks: taxonomy, earned: 0 },
    { name: "Prompt quality", max: 14, checks: prompt, earned: 0 },
    { name: "Extraction accuracy", max: 12, checks: extraction, earned: 0 },
    { name: "Classification metrics", max: 12, checks: classification, earned: 0 },
    { name: "Evidence quality", max: 12, checks: evidence, earned: 0 },
    { name: "Evaluation methodology", max: 14, checks: evalM, earned: 0 },
    { name: "Error analysis", max: 10, checks: errors, earned: 0 },
    { name: "System architecture", max: 14, checks: archChecks, earned: 0 },
  ].map((c) => ({ ...c, earned: Math.round(c.checks.reduce((a, x) => a + x.earned, 0) * 10) / 10 }));

  return { total: Math.round(criteria.reduce((a, c) => a + c.earned, 0) * 10) / 10, criteria };
}

export function runMetrics(pairs: { gold: string; pred: string | null }[]) {
  const labels = [...CANON];
  const m = confusion(labels, pairs.map((p) => p.gold), pairs.map((p) => p.pred ?? "none"));
  return multiClassReport(labels, m);
}
