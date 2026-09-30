/**
 * Fine-grained concept tags. Every question is tagged with one concept so the
 * mistake database can group recurring errors ("Confusing precision and
 * recall") and the recommender can point at the right lesson + practice set.
 */
export interface Concept {
  id: string;
  name: string;
  lesson: string; // lesson slug
  mistakeLabel: string; // how a recurring mistake on this concept is described
  compare?: { label: string; href: string };
}

const c = (
  id: string,
  name: string,
  lesson: string,
  mistakeLabel: string,
  compare?: Concept["compare"],
): Concept => ({ id, name, lesson, mistakeLabel, compare });

export const CONCEPTS: Concept[] = [
  // Module 1 — NLP
  c("tokens-vs-words", "Tokens vs words", "tokenization", "Treating tokens as words"),
  c("token-cost", "Token cost & context budget", "tokenization", "Mis-estimating token cost / context usage"),
  c("multilingual-tokenization", "Tokenization across scripts", "tokenization", "Assuming all languages tokenize equally"),
  c("normalization-info-loss", "Normalization destroys information", "text-normalization", "Over-normalizing and losing signal"),
  c("normalization-order", "Normalization ordering", "text-normalization", "Applying normalization steps in the wrong order"),
  c("romanization", "Romanized Hindi variation", "text-normalization", "Ignoring Romanization variants"),
  c("edit-distance", "Edit distance", "fuzzy-matching", "Mis-computing edit distance"),
  c("similarity-threshold", "Similarity thresholds", "fuzzy-matching", "Picking fuzzy thresholds without measuring FP/FN", {
    label: "Precision vs recall",
    href: "/learn/classification-metrics",
  }),
  c("jaro-winkler", "Jaro-Winkler", "fuzzy-matching", "Misunderstanding Jaro-Winkler's prefix bonus"),
  c("phonetic-codes", "Phonetic codes", "phonetic-matching", "Misreading how Soundex/Metaphone encode"),
  c("phonetic-limits", "Limits of phonetic matching", "phonetic-matching", "Over-trusting phonetic matches"),
  c("dialogue-acts", "Dialogue acts", "dialogue-structure", "Confusing dialogue act types"),
  c("adjacency-pairs", "Adjacency pairs", "dialogue-structure", "Ignoring question→answer pairing"),
  c("segmentation", "Conversation segmentation", "dialogue-structure", "Weak conversation segmentation"),
  c("speaker-cues", "Speaker attribution cues", "speaker-attribution", "Misreading speaker-role cues"),
  c("error-propagation", "Error propagation", "speaker-attribution", "Underestimating upstream error propagation", {
    label: "Per-stage evaluation",
    href: "/learn/per-stage-evaluation",
  }),
  c("ner-spans", "Entity span boundaries", "ner", "Inconsistent entity span boundaries"),
  c("ner-evaluation", "NER evaluation", "ner", "Confusing strict vs partial NER matching"),
  c("multiclass-vs-multilabel", "Multi-class vs multi-label", "text-classification", "Confusing multi-class and multi-label"),
  c("hierarchical-labels", "Hierarchical labels", "text-classification", "Poor hierarchical label design"),

  // Module 2 — LLM engineering
  c("few-shot", "Few-shot prompting", "prompt-engineering", "Misusing few-shot examples"),
  c("prompt-specificity", "Prompt specificity & constraints", "prompt-engineering", "Writing vague prompts"),
  c("json-schema", "JSON schema design", "structured-output", "Weak JSON schema design"),
  c("output-validation", "Output validation", "structured-output", "Trusting unvalidated model output"),
  c("constrained-decoding", "Constrained decoding", "structured-output", "Misunderstanding constrained generation"),
  c("lost-in-middle", "Position effects in long context", "context-engineering", "Ignoring where information sits in context"),
  c("context-budget", "Context budget & prompt bloat", "context-engineering", "Stuffing the context window"),
  c("retrieval-vs-stuffing", "Retrieval vs stuffing", "context-engineering", "Choosing stuffing vs retrieval poorly"),
  c("evidence-spans", "Evidence spans", "grounding", "Weak evidence selection"),
  c("entailment", "Entailment vs insufficient evidence", "grounding", "Confusing 'unsupported' with 'contradicted'"),
  c("judge-bias", "LLM judge biases", "llm-judge", "Trusting LLM judges without bias checks"),
  c("judge-validation", "Validating judges", "llm-judge", "Treating LLM-judge scores as ground truth"),
  c("hallucination-types", "Hallucination types", "hallucination", "Misclassifying hallucination types"),
  c("temperature", "Temperature", "sampling", "Misunderstanding temperature"),
  c("top-p", "Top-p (nucleus) sampling", "sampling", "Misunderstanding top-p"),
  c("determinism", "Determinism", "sampling", "Assuming temperature 0 is perfectly deterministic"),
  c("model-tradeoffs", "Model trade-offs", "model-selection", "Choosing models on quality alone"),
  c("moe", "Dense vs mixture-of-experts", "model-selection", "Misunderstanding MoE cost/latency"),
  c("prompt-caching", "Prompt caching", "caching-batching", "Misunderstanding prompt caching"),
  c("batching", "Batching", "caching-batching", "Misusing batch processing"),
  c("pipeline-latency", "Pipeline latency", "pipeline-design", "Mis-estimating pipeline latency"),
  c("error-compounding", "Error compounding", "pipeline-design", "Ignoring error compounding across stages"),
  c("routing", "Routing", "pipeline-design", "Under-using routing"),
  c("rag-overuse", "When RAG is needed", "rag-agents", "Overusing RAG"),
  c("agent-overuse", "When agents are needed", "rag-agents", "Overusing agents"),

  // Module 3 — Evaluation
  c("guideline-design", "Annotation guideline design", "annotation-guidelines", "Vague label definitions"),
  c("edge-cases", "Edge cases & escalation", "annotation-guidelines", "Missing edge-case rules"),
  c("kappa", "Cohen's kappa", "inter-annotator-agreement", "Weak understanding of kappa"),
  c("chance-agreement", "Chance agreement", "inter-annotator-agreement", "Confusing raw agreement with agreement beyond chance"),
  c("krippendorff", "Krippendorff's alpha / Fleiss", "inter-annotator-agreement", "Choosing the wrong agreement statistic"),
  c("precision", "Precision", "classification-metrics", "Misreading precision"),
  c("recall", "Recall", "classification-metrics", "Misreading recall"),
  c("precision-vs-recall", "Precision vs recall", "classification-metrics", "Confusing precision and recall", {
    label: "Compare precision vs recall",
    href: "/learn/classification-metrics#lab",
  }),
  c("f1", "F1 score", "classification-metrics", "Misunderstanding the F1 score"),
  c("business-metric-choice", "Business-driven metric choice", "classification-metrics", "Picking metrics without business costs"),
  c("macro-vs-micro", "Macro vs micro averaging", "macro-micro", "Confusing macro and micro averaging"),
  c("accuracy-paradox", "Accuracy paradox", "class-imbalance", "Trusting accuracy on imbalanced data"),
  c("base-rate", "Base rates & prevalence", "class-imbalance", "Ignoring base rates"),
  c("stratified-sampling", "Stratified sampling", "class-imbalance", "Not stratifying evaluation samples"),
  c("test-set-overfitting", "Test-set overfitting", "gold-set-design", "Tuning prompts on the test set"),
  c("data-splits", "Train/dev/test splits", "gold-set-design", "Misusing data splits"),
  c("per-stage-eval", "Per-stage evaluation", "per-stage-evaluation", "Relying on end-to-end accuracy only"),
  c("error-attribution", "Error attribution", "per-stage-evaluation", "Blaming the wrong pipeline stage"),
  c("calibration", "Calibration", "calibration", "Confusing confidence with accuracy"),
  c("ece", "ECE & reliability diagrams", "calibration", "Misreading reliability diagrams"),
  c("slicing", "Slicing", "error-analysis", "Looking only at aggregate metrics"),
  c("root-cause", "Root-cause analysis", "error-analysis", "Stopping at symptoms instead of root causes"),
  c("significance", "Statistical significance", "significance", "Declaring winners without significance"),
  c("confidence-intervals", "Confidence intervals", "significance", "Ignoring confidence intervals"),
  c("sample-size", "Sample size", "significance", "Using too-small evaluation samples"),
  c("paired-tests", "Paired comparisons", "significance", "Using unpaired tests for paired data"),

  // Module 4 — Information extraction & taxonomy
  c("taxonomy-boundaries", "Taxonomy boundaries", "taxonomy-design", "Poor taxonomy boundaries"),
  c("taxonomy-dimensions", "Taxonomy dimensions", "taxonomy-design", "Mixing dimensions in one label set"),
  c("open-vs-closed-set", "Open vs closed set", "open-closed-set", "Choosing open vs closed set poorly"),
  c("embeddings", "Embeddings", "embeddings", "Misunderstanding embeddings"),
  c("cosine-similarity", "Cosine similarity", "embeddings", "Misreading cosine similarity"),
  c("clustering", "Clustering", "clustering", "Misinterpreting clusters"),
  c("topic-modeling", "Topic modeling", "clustering", "Misunderstanding topic modeling"),
];

export const CONCEPT_MAP: Record<string, Concept> = Object.fromEntries(CONCEPTS.map((x) => [x.id, x]));

export function getConcept(id: string): Concept {
  return (
    CONCEPT_MAP[id] ?? {
      id,
      name: id,
      lesson: "tokenization",
      mistakeLabel: id,
    }
  );
}
