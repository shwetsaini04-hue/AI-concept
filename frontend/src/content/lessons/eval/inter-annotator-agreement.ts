import type { Lesson } from "../../types";

export const interAnnotatorAgreement: Lesson = {
  slug: "inter-annotator-agreement",
  module: "eval",
  order: 2,
  title: "Inter-Annotator Agreement",
  tagline: "Raw agreement ≠ agreement beyond chance: Cohen's κ, Fleiss' κ and Krippendorff's α.",
  difficulty: "Intermediate",
  minutes: 35,
  stages: ["evaluation"],
  why: `Before you measure a model against labels, measure the labels against themselves. **[[Inter-annotator agreement|iaa]]** tells you how reproducible your ground truth is — an upper bound on how precisely any system can be evaluated.

The trap: raw agreement looks great when one label dominates. Two annotators who both say "Interested" 90% of the time will agree ~82% of the time *by chance alone*. Chance-corrected statistics — **[[Cohen's κ|cohens-kappa]]**, **[[Fleiss' κ|fleiss-kappa]]**, **[[Krippendorff's α|krippendorff-alpha]]** — ask the right question: how much better than chance are we?`,
  concepts: [
    {
      title: "Cohen's kappa: agreement beyond chance",
      intuition: `Kappa compares how often annotators agree (pₒ) with how often they'd agree by guessing with their usual label frequencies (pₑ). κ = 1 is perfect, κ = 0 is chance-level, negative is worse than chance.`,
      technical: `κ = (pₒ − pₑ) / (1 − pₑ). For two annotators A, B over categories k: pₒ = fraction of items with identical labels; pₑ = Σ_k p_A(k)·p_B(k) using each annotator's marginal distribution. κ depends on prevalence and bias (the "kappa paradoxes"): with skewed marginals, high pₒ can coexist with low κ. Always report κ with pₒ and the marginals, and interpret bands (e.g., Landis & Koch) as conventions, not laws.`,
      example: `pₒ = 0.90, both annotators label "Interested" 90% of the time → pₑ = 0.9² + 0.1² = 0.82 → κ = (0.90 − 0.82)/(0.18) ≈ 0.44 — only "moderate", despite 90% raw agreement.`,
    },
    {
      title: "More than two annotators, and missing labels",
      intuition: `**Fleiss' κ** extends the idea to many annotators (each item rated by the same number of people). **Krippendorff's α** is the most flexible: any number of annotators, missing labels allowed, and it supports ordinal/interval data with a distance function.`,
      technical: `Fleiss: κ = (P̄ − P̄ₑ)/(1 − P̄ₑ), with P̄ = mean per-item pairwise agreement and P̄ₑ = Σ p_j² from pooled category proportions; assumes a fixed number of raters per item. Krippendorff: α = 1 − D_o/D_e from a coincidence matrix over pairable values (units with ≥ 2 ratings); nominal distance for categorical labels. α handles incomplete designs common in production annotation (not every item double-labelled).`,
      example: `Three annotators on 20 utterances where one annotator skipped two items: Fleiss' κ must drop those items; Krippendorff's α uses all available pairs. Compare them in the lab.`,
    },
  ],
  questions: {
    what: "Statistics measuring how consistently multiple annotators label the same items, corrected for chance agreement.",
    why: "Labels are the reference for all metrics; unreliable labels make metrics unreliable.",
    problem: "It quantifies label reliability, reveals ambiguous categories, and sets realistic ceilings for model performance.",
    how: "Double-label a sample, compute κ/α, inspect the confusion between annotators, revise guidelines, repeat.",
    onRealData: "Skewed label distributions (most calls not interested) make raw agreement misleadingly high; hedges and sarcasm drive disagreements.",
    whatCanGoWrong: "Reporting raw agreement only; ignoring prevalence effects; computing κ on a non-representative sample; using Fleiss with missing labels.",
    howToEvaluate: "Report κ/α with raw agreement, marginals, sample size and a CI (bootstrap); per-category agreement.",
    whenToUse: "Whenever you create or buy labels — pilots, ongoing QA (e.g., 10–15% double-labelled).",
    whenNotToUse: "Don't compare κ across datasets with very different prevalence without caution.",
    downstream: "Low agreement caps achievable metrics, makes model comparisons noisy, and indicates taxonomy/guideline problems.",
  },
  lab: {
    id: "inter-annotator-agreement",
    title: "Agreement lab",
    intro: "Three annotators label twenty utterances. Change any label and watch raw agreement, Cohen's κ (with its pₒ/pₑ breakdown), Fleiss' κ and Krippendorff's α update. Try the majority-class paradox preset.",
    modes: ["computed"],
  },
  realWorld: {
    text: `A labelling vendor reported "93% agreement" on compliance-violation labels. The violation rate was 4%. Computing κ gave 0.31: annotators agreed mostly on the easy "no violation" calls and rarely on which calls contained violations. The client renegotiated the contract to specify κ ≥ 0.7 on a stratified sample containing at least 30% violations.`,
  },
  mistakes: [
    { mistake: "Reporting raw agreement", why: "Chance agreement inflates it under class imbalance.", fix: "Report κ/α alongside raw agreement and marginals." },
    { mistake: "Measuring agreement on easy items only", why: "Random samples of imbalanced data are mostly easy negatives.", fix: "Stratify the agreement sample to include rare classes." },
    { mistake: "Treating κ bands as absolute truth", why: "κ depends on prevalence and number of categories.", fix: "Use bands as rough guidance; compare like with like." },
    { mistake: "Using Fleiss' κ with missing labels", why: "Items with missing ratings must be dropped.", fix: "Use Krippendorff's α for incomplete designs." },
  ],
  decision: {
    question: "Which agreement statistic should you report?",
    useWhen: ["Cohen's κ: exactly two annotators", "Fleiss' κ: fixed number (>2) of raters per item", "Krippendorff's α: missing labels, varying raters, ordinal data"],
    avoidWhen: ["Raw agreement alone on imbalanced labels"],
    tradeoffs: [
      { a: "Double-labelling more data", b: "Cost", note: "10–15% double-labelling is a common compromise for ongoing QA." },
      { a: "Fine-grained labels", b: "Agreement", note: "Merging rarely-agreed categories can raise κ — at the cost of nuance." },
    ],
  },
  exercises: [
    {
      id: "iaa-ex-1",
      kind: "numeric",
      exType: "applied",
      difficulty: "Intermediate",
      concept: "kappa",
      prompt: "Two annotators label 50 calls. Both 'yes': 20; A yes/B no: 5; A no/B yes: 10; both 'no': 15. Compute Cohen's κ.",
      answer: 0.4,
      tolerance: 0.01,
      hint: "pₒ = (20+15)/50. A says yes 25/50, B says yes 30/50.",
      explanation: "pₒ = 0.70. pₑ = 0.5·0.6 + 0.5·0.4 = 0.50. κ = (0.70 − 0.50)/0.50 = **0.40**.",
    },
    {
      id: "iaa-ex-2",
      kind: "mcq",
      exType: "conceptual",
      difficulty: "Intermediate",
      concept: "chance-agreement",
      prompt: "Why can raw agreement be 90% while κ is near 0?",
      options: [
        { text: "When both annotators use one label almost always, they agree often by chance", correct: true },
        { text: "Because κ ignores agreement", whyWrong: "κ uses observed agreement; it subtracts chance." },
        { text: "It can't; κ is always close to raw agreement", whyWrong: "Under skew they diverge sharply." },
        { text: "Because κ only works with 3+ annotators", whyWrong: "Cohen's κ is for two." },
      ],
      hint: "Compute pₑ with 90/10 marginals.",
      explanation: "pₑ ≈ 0.82 with 90/10 marginals; agreement above that is what κ credits.",
    },
    {
      id: "iaa-ex-3",
      kind: "text",
      exType: "engineering",
      difficulty: "Advanced",
      concept: "krippendorff",
      prompt: "Design an ongoing label-quality process for a team of 6 annotators labelling 2,000 calls/week with rare compliance violations.",
      rubric: [
        { idea: "Double-label a sample (e.g., 10–15%)", keywords: ["double", "overlap", "sample", "10%", "15%"] },
        { idea: "Stratify to include rare positives", keywords: ["stratif", "rare", "oversample", "violations"] },
        { idea: "Use Krippendorff's α (missing/varying raters)", keywords: ["krippendorff", "alpha", "α", "missing"] },
        { idea: "Adjudicate disagreements & update guidelines", keywords: ["adjudicat", "guideline", "ruling", "resolve"] },
        { idea: "Track per-annotator and per-category agreement over time", keywords: ["per annotator", "per-annotator", "per category", "over time", "trend", "weekly"] },
      ],
      minIdeas: 3,
      hint: "Sampling, statistic, feedback loop.",
      modelAnswer:
        "Double-label ~15% of calls, stratified so suspected violations are ≥30% of the overlap sample. With 6 annotators and varying overlap, compute Krippendorff's α weekly (overall and per category) plus per-annotator agreement with adjudicated labels. Adjudicate disagreements, add rulings to the guideline, retrain drifting annotators, and report α with bootstrap CIs.",
      explanation: "Agreement is a process metric, not a one-off number.",
    },
  ],
  quiz: [
    {
      id: "iaa-q-1",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "kappa",
      prompt: "κ = 0 means…",
      options: [
        { text: "Agreement equals what's expected by chance", correct: true },
        { text: "Annotators never agree", whyWrong: "They may agree often — just not more than chance." },
        { text: "Perfect agreement", whyWrong: "That's κ = 1." },
        { text: "The data is invalid", whyWrong: "No." },
      ],
      hint: "(pₒ − pₑ) = 0.",
      explanation: "No agreement beyond chance.",
    },
    {
      id: "iaa-q-2",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "krippendorff",
      prompt: "Which statistic handles missing labels naturally?",
      options: [
        { text: "Krippendorff's α", correct: true },
        { text: "Cohen's κ", whyWrong: "Designed for two annotators on the same items." },
        { text: "Fleiss' κ", whyWrong: "Assumes a fixed number of raters per item." },
        { text: "Accuracy", whyWrong: "Not an agreement statistic." },
      ],
      hint: "Coincidence matrix over pairable values.",
      explanation: "α uses all pairable ratings.",
    },
    {
      id: "iaa-q-3",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "chance-agreement",
      prompt: "Chance agreement pₑ in Cohen's κ is computed from…",
      options: [
        { text: "Each annotator's marginal label distribution", correct: true },
        { text: "The model's predictions", whyWrong: "No model involved." },
        { text: "A uniform distribution over labels", whyWrong: "That's a different (Bennett) statistic." },
        { text: "The number of items", whyWrong: "Not directly." },
      ],
      hint: "Σ p_A(k) p_B(k).",
      explanation: "Products of each annotator's label proportions.",
    },
    {
      id: "iaa-q-4",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "kappa",
      prompt: "Annotator κ on your intent labels is 0.55. A model's κ with the adjudicated labels is 0.70. Interpretation?",
      options: [
        { text: "Plausible but check carefully: the model agrees with adjudicated labels more than annotators agree with each other — adjudication removes noise", correct: true },
        { text: "Impossible", whyWrong: "Adjudicated labels are cleaner than single annotations." },
        { text: "The model is overfitting annotators", whyWrong: "Not implied." },
        { text: "κ values can't be compared", whyWrong: "They can, with care." },
      ],
      hint: "Single annotations vs adjudicated gold.",
      explanation: "Adjudicated labels are less noisy than any single annotator.",
    },
    {
      id: "iaa-q-5",
      kind: "multi",
      difficulty: "Advanced",
      concept: "chance-agreement",
      prompt: "What should accompany a reported κ? (Select all)",
      options: [
        { text: "Raw agreement and the label marginals", correct: true },
        { text: "Sample size and how items were sampled", correct: true },
        { text: "A confidence interval", correct: true },
        { text: "The model's F1", whyWrong: "Unrelated to annotator agreement." },
      ],
      hint: "Context for interpretation.",
      explanation: "κ is interpretable only with prevalence, sampling and uncertainty.",
    },
  ],
  challenge: {
    id: "iaa-ch-1",
    kind: "numeric",
    exType: "applied",
    difficulty: "Advanced",
    concept: "chance-agreement",
    prompt: "Two annotators each label 95% of calls 'not violation'. They agree on 94% of calls. Compute κ (2 decimals).",
    answer: 0.37,
    tolerance: 0.01,
    hint: "pₑ = 0.95² + 0.05².",
    explanation: "pₑ = 0.9025 + 0.0025 = 0.905. κ = (0.94 − 0.905)/(1 − 0.905) = 0.035/0.095 ≈ **0.37** — 94% raw agreement, only fair agreement beyond chance.",
  },
  code: {
    title: "κ and α in Python",
    code: `from sklearn.metrics import cohen_kappa_score
import numpy as np

A = ["INT","NOT","INS","INS","INT","NOT","NOT","INT","INT","NOT"]
B = ["INT","NOT","INS","NOT","INT","INS","NOT","INS","INT","NOT"]
print("raw agreement:", np.mean(np.array(A) == np.array(B)))
print("Cohen's kappa:", round(cohen_kappa_score(A, B), 3))

# Krippendorff's alpha (nominal) from scratch, with a missing rating (None)
def kripp_alpha(units):
    from collections import Counter
    pairs = Counter()
    for u in units:
        vals = [v for v in u if v is not None]
        m = len(vals)
        if m < 2: continue
        for i in range(m):
            for j in range(m):
                if i != j: pairs[(vals[i], vals[j])] += 1 / (m - 1)
    n_c = Counter()
    for (c, k), w in pairs.items(): n_c[c] += w
    n = sum(n_c.values())
    Do = sum(w for (c, k), w in pairs.items() if c != k) / n
    De = sum(n_c[c] * n_c[k] for c in n_c for k in n_c if c != k) / (n * (n - 1))
    return 1 - Do / De

C = ["INT","NOT","INS","INS",None,"NOT","NOT","INT","INT",None]
print("Krippendorff alpha (A,B,C):", round(kripp_alpha(list(zip(A, B, C))), 3))
`,
  },
  related: ["annotation-guidelines", "llm-judge", "classification-metrics"],
  terms: ["iaa", "cohens-kappa", "fleiss-kappa", "krippendorff-alpha", "chance-agreement"],
};
