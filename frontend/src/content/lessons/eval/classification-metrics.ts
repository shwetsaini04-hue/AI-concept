import type { Lesson } from "../../types";

export const classificationMetrics: Lesson = {
  slug: "classification-metrics",
  module: "eval",
  order: 3,
  title: "Classification Metrics",
  tagline: "Precision, recall, F1, accuracy — and why the right metric is a business decision.",
  difficulty: "Beginner",
  minutes: 35,
  stages: ["evaluation", "decision"],
  why: `Every classification metric is a different summary of the same four numbers in the **[[confusion matrix|confusion-matrix]]**: true positives, false positives, false negatives, true negatives. Choosing which summary to optimize is choosing which mistakes you're willing to make.

For "genuinely interested customer" detection: a false positive wastes a sales call; a false negative loses a customer who wanted a loan. Which is worse depends on your costs — and that decides whether you chase **[[precision]]**, **[[recall]]**, or a weighted balance.`,
  concepts: [
    {
      title: "The four cells and the metrics built from them",
      intuition: `- **Precision**: of the customers we flagged, how many were really interested?
- **Recall**: of the really interested customers, how many did we flag?
- **F1**: a single number that's high only when both are high.
- **[[Accuracy|accuracy]]**: fraction of all calls we got right — dominated by the easy majority.`,
      technical: `Precision = TP/(TP+FP); Recall (sensitivity, TPR) = TP/(TP+FN); [[Specificity|specificity]] = TN/(TN+FP); Accuracy = (TP+TN)/N; [[F1|f1]] = 2PR/(P+R) (harmonic mean); F_β = (1+β²)PR/(β²P + R) weights recall β times as much as precision (in the squared sense). Precision depends on prevalence; recall and specificity don't.`,
      example: `TP 40, FP 10, FN 20, TN 930: precision 0.80, recall 0.67, F1 0.73, accuracy 0.97. The 97% says almost nothing — it's mostly the 930 easy negatives.`,
    },
    {
      title: "Thresholds and business costs",
      intuition: `Most classifiers output a score; you choose the cut-off. Lower threshold → catch more interested customers (recall ↑) but call more uninterested ones (precision ↓). Put a price on each mistake and the best threshold falls out of the arithmetic.`,
      technical: `Expected cost(τ) = C_FP·FP(τ) + C_FN·FN(τ) (optionally minus value of TPs). Minimize over τ on a validation set. When costs are unknown, report precision–recall curves and choose an operating point with stakeholders; F_β with β² = C_FN/C_FP is a common proxy. Re-tune when prevalence or costs change.`,
      example: `If a wasted call costs ₹150 and a lost customer ₹2,500, missing a customer is ~17× worse: the cost-minimizing threshold moves low, favouring recall. Explore it in the lab's threshold tab.`,
    },
  ],
  questions: {
    what: "Numerical summaries of a classifier's agreement with gold labels, derived from the confusion matrix.",
    why: "Different errors have different consequences; metrics make them visible and comparable.",
    problem: "They quantify how well a system serves its purpose and guide threshold and model choices.",
    how: "Count TP/FP/FN/TN per class; compute precision, recall, F1, specificity; sweep thresholds for curves.",
    onRealData: "Interested customers are a minority; accuracy flatters; costs of FP and FN differ greatly by business line.",
    whatCanGoWrong: "Optimizing accuracy on imbalanced data; confusing precision with recall; ignoring prevalence effects on precision; choosing thresholds on the test set.",
    howToEvaluate: "Per-class precision/recall/F1 with CIs, PR curves, cost at the chosen operating point.",
    whenToUse: "Always for classification; choose the headline metric with stakeholders.",
    whenNotToUse: "Don't use accuracy as the headline on imbalanced tasks.",
    downstream: "The chosen metric drives prompt/model choices, thresholds and the business outcome (wasted calls vs lost customers).",
  },
  lab: {
    id: "classification-metrics",
    title: "Confusion-matrix playground",
    intro: "Edit TP/FP/FN/TN and watch precision, recall, F1, accuracy, specificity and F-β update. Then choose a decision threshold on overlapping score distributions using business costs for false positives and false negatives.",
    modes: ["computed", "simulated"],
  },
  realWorld: {
    text: `A sales team was told the lead classifier had "96% accuracy". Callers complained that most leads were cold. Precision on "interested" was 38%: only 4% of calls were genuinely interested, so the accuracy came from correctly ignoring uninterested calls. Re-framing the goal as "precision ≥ 0.7 at recall ≥ 0.5" and tuning the threshold on a validation set made the leads usable.`,
  },
  mistakes: [
    { mistake: "Headlining accuracy on imbalanced data", why: "The majority class dominates.", fix: "Report per-class precision/recall and macro-F1." },
    { mistake: "Confusing precision and recall", why: "They answer different questions (flagged vs actual).", fix: "Precision: 'of what I flagged'; recall: 'of what exists'." },
    { mistake: "Choosing the threshold without costs", why: "0.5 is arbitrary.", fix: "Pick the operating point from business costs on validation data." },
  ],
  decision: {
    question: "Which metric should you optimize for 'interested customer' detection?",
    useWhen: ["Precision when false leads are expensive (limited callers)", "Recall when missing a customer is expensive (high customer value)", "F_β / expected cost when both matter with known ratios"],
    avoidWhen: ["Accuracy as the sole metric under imbalance"],
    tradeoffs: [
      { a: "Recall", b: "Precision", note: "Moving the threshold trades one for the other; the right point depends on costs." },
      { a: "Single number (F1)", b: "Full curve", note: "F1 is convenient but hides where on the curve you operate." },
    ],
  },
  exercises: [
    {
      id: "cm-ex-1",
      kind: "numeric",
      exType: "applied",
      difficulty: "Beginner",
      concept: "precision",
      prompt: "TP = 40, FP = 10, FN = 20, TN = 930. What is precision?",
      answer: 0.8,
      tolerance: 0.001,
      hint: "TP / (TP + FP).",
      explanation: "40 / 50 = **0.80**.",
    },
    {
      id: "cm-ex-2",
      kind: "mcq",
      exType: "conceptual",
      difficulty: "Intermediate",
      concept: "precision-vs-recall",
      prompt: "Sales has only 5 callers and can't waste calls. Which metric should dominate?",
      options: [
        { text: "Precision", correct: true },
        { text: "Recall", whyWrong: "Recall ignores wasted calls; it's about not missing customers." },
        { text: "Accuracy", whyWrong: "Dominated by negatives." },
        { text: "Specificity", whyWrong: "Related, but precision directly measures lead quality." },
      ],
      hint: "Which metric counts wasted calls?",
      explanation: "Limited capacity → precision (quality of flagged leads).",
    },
    {
      id: "cm-ex-3",
      kind: "text",
      exType: "conceptual",
      difficulty: "Intermediate",
      concept: "business-metric-choice",
      prompt: "Explain to a sales manager why a 97%-accurate lead model might be useless.",
      rubric: [
        { idea: "Most calls are not interested (imbalance)", keywords: ["most calls", "imbalance", "minority", "rare", "few interested", "few percent", "only a few", "small fraction"] },
        { idea: "Accuracy dominated by true negatives", keywords: ["true negative", "negatives", "easy", "not interested correctly", "ignoring uninterested", "uninterested calls", "ignoring"] },
        { idea: "Precision/recall on interested is what matters", keywords: ["precision", "recall"] },
        { idea: "Connect to wasted calls / missed customers", keywords: ["wasted", "missed", "cold", "callers", "customers"] },
      ],
      minIdeas: 3,
      hint: "What does accuracy count, and what does sales care about?",
      modelAnswer:
        "Only a few percent of calls are genuinely interested, so a model can be 97% accurate mainly by correctly ignoring uninterested calls. What sales cares about is: of the leads we send you, how many are real (precision), and of the real ones, how many we find (recall). A model with 97% accuracy can still send mostly cold leads or miss most warm ones.",
      explanation: "Translate metrics into the business's language: wasted calls and missed customers.",
    },
    {
      id: "cm-ex-4",
      kind: "json",
      exType: "engineering",
      difficulty: "Intermediate",
      concept: "business-metric-choice",
      prompt: "Write the evaluation config for the lead classifier as JSON: `primary_metric` (\"precision\", \"recall\" or \"f_beta\"), `beta`, `min_precision`, `min_recall`. Sales has only 5 callers (wasted calls hurt), but a missed customer costs about 4× a wasted call.",
      starter: `{
  "primary_metric": "",
  "beta": 1,
  "min_precision": 0,
  "min_recall": 0
}`,
      checks: [
        { label: "primary_metric is f_beta (both errors matter, unequally)", test: (v) => v?.primary_metric === "f_beta" },
        { label: "beta ≈ 2 (β² ≈ cost ratio 4)", test: (v) => typeof v?.beta === "number" && v.beta >= 1.5 && v.beta <= 2.5 },
        { label: "min_precision ≥ 0.5 (protect the 5 callers)", test: (v) => typeof v?.min_precision === "number" && v.min_precision >= 0.5 && v.min_precision <= 1 },
        { label: "min_recall ≥ 0.5", test: (v) => typeof v?.min_recall === "number" && v.min_recall >= 0.5 && v.min_recall <= 1 },
      ],
      hint: "β² ≈ cost of a false negative / cost of a false positive.",
      modelAnswer: `{
  "primary_metric": "f_beta",
  "beta": 2,
  "min_precision": 0.6,
  "min_recall": 0.7
}`,
      explanation: "F₂ weights recall ~4× in the squared sense, matching the cost ratio, while a precision floor protects limited caller capacity.",
    },
  ],
  quiz: [
    {
      id: "cm-q-1",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "recall",
      prompt: "Recall answers:",
      options: [
        { text: "Of all truly interested customers, what fraction did we flag?", correct: true },
        { text: "Of all flagged customers, what fraction were interested?", whyWrong: "That's precision." },
        { text: "What fraction of all calls were correct?", whyWrong: "That's accuracy." },
        { text: "What fraction of uninterested customers were left alone?", whyWrong: "That's specificity." },
      ],
      hint: "Denominator: actual positives.",
      explanation: "Recall = TP/(TP+FN).",
    },
    {
      id: "cm-q-2",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "precision-vs-recall",
      prompt: "Lowering the decision threshold usually…",
      options: [
        { text: "Raises recall, lowers precision", correct: true },
        { text: "Raises precision, lowers recall", whyWrong: "Opposite." },
        { text: "Raises both", whyWrong: "Trade-off." },
        { text: "Changes nothing", whyWrong: "It changes which calls are flagged." },
      ],
      hint: "More calls get flagged.",
      explanation: "More positives flagged → more TPs and FPs.",
    },
    {
      id: "cm-q-3",
      kind: "numeric",
      difficulty: "Intermediate",
      concept: "f1",
      prompt: "Precision 0.6, recall 0.9. F1 = ? (3 decimals)",
      answer: 0.72,
      tolerance: 0.001,
      hint: "2PR/(P+R).",
      explanation: "2 × 0.54 / 1.5 = **0.72** — pulled toward the weaker metric.",
    },
    {
      id: "cm-q-4",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "business-metric-choice",
      prompt: "A missed interested customer costs 10× a wasted call. Which F_β fits?",
      options: [
        { text: "β > 1 (weights recall more)", correct: true },
        { text: "β < 1", whyWrong: "That favours precision." },
        { text: "β = 1", whyWrong: "Equal weighting ignores the cost asymmetry." },
        { text: "β = 0", whyWrong: "That's precision only." },
      ],
      hint: "β² ≈ cost ratio.",
      explanation: "Recall-heavy: β² ≈ 10 → β ≈ 3.2.",
    },
    {
      id: "cm-q-5",
      kind: "mcq",
      difficulty: "Advanced",
      concept: "precision",
      prompt: "The same classifier is deployed where interested customers are rarer. What changes most?",
      options: [
        { text: "Precision drops; recall and specificity stay similar", correct: true },
        { text: "Recall drops", whyWrong: "Recall is conditional on actual positives; it's prevalence-independent." },
        { text: "Specificity drops", whyWrong: "Also prevalence-independent." },
        { text: "Nothing changes", whyWrong: "Precision depends on prevalence." },
      ],
      hint: "Which metric has negatives in its denominator mix?",
      explanation: "Precision = sens·prev / (sens·prev + (1−spec)(1−prev)) falls with prevalence.",
    },
  ],
  challenge: {
    id: "cm-ch-1",
    kind: "numeric",
    exType: "applied",
    difficulty: "Advanced",
    concept: "business-metric-choice",
    prompt: "Operating point A: FP = 120, FN = 30. Point B: FP = 60, FN = 55. A false positive costs ₹150, a false negative ₹2,500. What is the cost difference (A − B) in ₹? (negative means A is cheaper)",
    answer: -53500,
    tolerance: 1,
    unit: "₹",
    hint: "Cost = 150·FP + 2,500·FN for each point.",
    explanation: "A: 18,000 + 75,000 = 93,000. B: 9,000 + 137,500 = 146,500. A − B = **−53,500**: the higher-recall point A is far cheaper despite twice the false positives.",
  },
  code: {
    title: "Metrics and cost-optimal threshold in scikit-learn",
    code: `import numpy as np
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix

rng = np.random.default_rng(3)
y = rng.random(2000) < 0.2
scores = np.clip(np.where(y, 0.64, 0.38) + rng.normal(0, 0.14, 2000), 0, 1)

C_FP, C_FN = 150, 2500
best = None
for t in np.arange(0.1, 0.9, 0.02):
    pred = scores >= t
    tn, fp, fn, tp = confusion_matrix(y, pred).ravel()
    cost = C_FP * fp + C_FN * fn
    if best is None or cost < best[0]:
        p, r, f, _ = precision_recall_fscore_support(y, pred, average="binary")
        best = (cost, t, p, r, f)
cost, t, p, r, f = best
print(f"cost-optimal threshold {t:.2f}: precision {p:.2f}, recall {r:.2f}, F1 {f:.2f}, cost Rs {cost:,}")
`,
  },
  related: ["macro-micro", "class-imbalance", "calibration"],
  terms: ["confusion-matrix", "precision", "recall", "f1", "accuracy", "specificity"],
};
