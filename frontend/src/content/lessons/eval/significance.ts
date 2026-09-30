import type { Lesson } from "../../types";

export const significance: Lesson = {
  slug: "significance",
  module: "eval",
  order: 10,
  title: "Statistical Significance",
  tagline: "Prompt B scored 84% vs A's 80% on 200 calls. Is B better — or did it get lucky?",
  difficulty: "Advanced",
  minutes: 35,
  stages: ["evaluation", "decision"],
  why: `Every evaluation score is an estimate from a finite sample. Evaluate two *identical* prompts on 100 random calls each and one will often "win" by 3–5 points purely by chance. Teams that ship the winner of every A/B comparison accumulate noise, not improvement.

**[[Confidence intervals|confidence-interval]]** show how uncertain each score is; **[[significance tests|statistical-significance]]** ask whether a difference is larger than chance would produce; **[[sample-size]]** planning tells you how many labelled calls you need *before* running the comparison. And because both prompts usually run on the same calls, **[[paired tests|paired-test]]** like **[[McNemar's test|mcnemar]]** are far more powerful than comparing two independent accuracies.`,
  concepts: [
    {
      title: "Confidence intervals and sample size",
      intuition: `An accuracy of 84% on 200 calls really means "probably somewhere between ~78% and ~88%". Two prompts whose ranges overlap a lot might not differ at all. To shrink the range by half, you need four times as many calls.`,
      technical: `For a proportion p̂ on n items, use the Wilson interval (better than p̂ ± 1.96·√(p̂(1−p̂)/n) near 0/1 or for small n). Standard error ∝ 1/√n. Required n per group to detect p₁ vs p₂ with two-sided α and power 1−β: n ≈ [z_{α/2}√(2p̄(1−p̄)) + z_β√(p₁(1−p₁)+p₂(1−p₂))]² / (p₁−p₂)². For F1 and other non-proportion metrics, use the [[bootstrap]].`,
      example: `80% vs 84%: ~1,400 calls per prompt for 80% power with independent samples. On 200 each, p ≈ 0.30 — not significant.`,
    },
    {
      title: "Paired comparisons: McNemar",
      intuition: `If both prompts ran on the same calls, most calls are easy (both right) or hopeless (both wrong). Only calls where they *disagree* tell you which is better. If B is right on 34 of those and A on 18, that lopsided split is evidence; a 26/26 split isn't.`,
      technical: `McNemar's test uses discordant counts b (A right, B wrong) and c (A wrong, B right). Under H₀ (equal accuracy) b ~ Binomial(b+c, 0.5). Exact two-sided p = 2·P(X ≤ min(b,c)); χ² approximation with continuity correction (|b−c|−1)²/(b+c). Pairing removes between-item variance, giving much more power than a two-proportion test at the same n. For F1, use a paired bootstrap (resample items, compute the metric difference).`,
      example: `400 calls: b = 18, c = 34 → exact p ≈ 0.036 → significant at 0.05, even though the accuracies (0.81 vs 0.85) have overlapping individual CIs.`,
    },
  ],
  questions: {
    what: "Tools for quantifying uncertainty in metric estimates and deciding whether differences exceed chance variation.",
    why: "Finite evaluation samples produce noisy scores; decisions based on noise waste effort and cause regressions.",
    problem: "It prevents shipping 'improvements' that are random fluctuations and sizes evaluation sets appropriately.",
    how: "Report CIs; use paired tests (McNemar, paired bootstrap) for same-item comparisons; plan sample size by power analysis.",
    onRealData: "Label noise, ambiguous calls and sampling variance all add noise; slices have much smaller n than the whole set.",
    whatCanGoWrong: "Declaring winners from point estimates; unpaired tests on paired data; p-hacking via many comparisons; confusing statistical and practical significance.",
    howToEvaluate: "Pre-register the comparison, metric and α; report effect size with CI and p-value; check power.",
    whenToUse: "Every model/prompt comparison that informs a decision.",
    whenNotToUse: "Don't treat p < 0.05 as proof of business value; don't skip effect sizes.",
    downstream: "Determines which changes ship, how much evaluation data to label, and how confident reports to stakeholders can be.",
  },
  lab: {
    id: "significance",
    title: "A/B prompt evaluation simulator",
    intro: "Compare two prompts: Wilson CIs, difference CI, p-value and required sample size update live. Then run McNemar on paired results, and watch two identical prompts 'beat' each other across 1,000 simulated evaluations.",
    modes: ["computed", "simulated"],
  },
  realWorld: {
    text: `Over six months a team shipped 14 prompt "improvements", each winning by 1–3 points on a 150-call dev set. A retrospective on a fresh 1,000-call sample showed the final prompt was no better than the version from month two. Afterwards: 600-call comparisons, paired McNemar tests, a minimum effect size of 2 points, and a monthly fresh sample.`,
  },
  mistakes: [
    { mistake: "Shipping the higher point estimate", why: "Noise produces 'winners'.", fix: "Require a significant paired test and a meaningful effect size." },
    { mistake: "Unpaired tests on paired data", why: "Throws away the pairing's power.", fix: "McNemar or paired bootstrap when both systems ran on the same items." },
    { mistake: "Too-small evaluation sets", why: "Can't detect realistic improvements.", fix: "Plan n with a power calculation before labelling." },
    { mistake: "Equating significance with importance", why: "A significant 0.3-point gain may not matter.", fix: "Report effect size with a CI and judge practical value." },
  ],
  decision: {
    question: "How do you decide whether prompt B beats prompt A?",
    useWhen: ["Paired test on the same items (McNemar / paired bootstrap)", "Pre-registered metric, α and minimum effect", "Enough items per power analysis"],
    avoidWhen: ["Point estimates alone", "Repeatedly testing on the same set until significant"],
    tradeoffs: [
      { a: "Larger eval sets", b: "Labelling cost", note: "Paired designs reduce the n needed for a given power." },
      { a: "Strict α", b: "Speed of iteration", note: "Stricter thresholds reduce false wins but need more data." },
    ],
  },
  exercises: [
    {
      id: "sig-ex-1",
      kind: "mcq",
      exType: "conceptual",
      difficulty: "Intermediate",
      concept: "significance",
      prompt: "Prompt A: 80% on 200 calls. Prompt B: 84% on a different 200 calls. Conclusion?",
      options: [
        { text: "Not enough evidence: the difference is within sampling noise (p ≈ 0.3)", correct: true },
        { text: "B is better", whyWrong: "The 4-point gap is not significant at this n." },
        { text: "A is better", whyWrong: "No evidence for that either." },
        { text: "They're identical", whyWrong: "Absence of evidence isn't evidence of equality." },
      ],
      hint: "SE of each ≈ 2.8 points.",
      explanation: "Two-proportion z-test p ≈ 0.30; you'd need ~1,400 per prompt for 80% power.",
    },
    {
      id: "sig-ex-2",
      kind: "numeric",
      exType: "applied",
      difficulty: "Advanced",
      concept: "paired-tests",
      prompt: "Paired results on 400 calls: A right/B wrong = 18, A wrong/B right = 34. Compute the McNemar χ² statistic with continuity correction (2 decimals).",
      answer: 4.33,
      tolerance: 0.02,
      hint: "(|b − c| − 1)² / (b + c).",
      explanation: "(16 − 1)² / 52 = 225/52 ≈ **4.33** → p ≈ 0.037 < 0.05.",
    },
    {
      id: "sig-ex-3",
      kind: "text",
      exType: "engineering",
      difficulty: "Advanced",
      concept: "sample-size",
      prompt: "Write an evaluation protocol for deciding whether a new prompt replaces the current one.",
      rubric: [
        { idea: "Same items for both prompts (paired)", keywords: ["same", "paired", "both prompts on"] },
        { idea: "Pre-specified metric, α and minimum effect", keywords: ["pre-", "specif", "alpha", "α", "minimum effect", "threshold"] },
        { idea: "Sample size from power analysis", keywords: ["power", "sample size", "how many"] },
        { idea: "McNemar / paired bootstrap", keywords: ["mcnemar", "bootstrap"] },
        { idea: "Report effect size with CI; check key slices", keywords: ["confidence interval", "ci", "effect size", "slice"] },
      ],
      minIdeas: 3,
      hint: "Design before you run.",
      modelAnswer:
        "Before running: fix the metric (macro-F1 and accuracy), α = 0.05, minimum practical gain = 2 points, and compute n for 80% power (e.g., ~600 calls given expected discordance). Run both prompts on the same stratified dev sample at temperature 0. Test accuracy with McNemar and macro-F1 with a paired bootstrap; report the difference with a 95% CI and check key slices (noisy, Romanized Hindi) for regressions. Ship only if significant, ≥ 2 points, and no slice regresses beyond tolerance.",
      explanation: "Decide the rules before seeing the results.",
    },
  ],
  quiz: [
    {
      id: "sig-q-1",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "confidence-intervals",
      prompt: "Doubling precision (halving CI width) requires roughly…",
      options: [
        { text: "4× the sample size", correct: true },
        { text: "2× the sample size", whyWrong: "SE ∝ 1/√n." },
        { text: "Half the sample size", whyWrong: "No." },
        { text: "The same sample size with a better model", whyWrong: "CI width is about n." },
      ],
      hint: "Width ∝ 1/√n.",
      explanation: "Square-root law.",
    },
    {
      id: "sig-q-2",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "significance",
      prompt: "A p-value of 0.03 means…",
      options: [
        { text: "If there were truly no difference, a result this extreme would occur ~3% of the time", correct: true },
        { text: "There's a 3% chance the prompts are equal", whyWrong: "Classic misinterpretation." },
        { text: "B is 3% better", whyWrong: "That's an effect size." },
        { text: "The result will replicate 97% of the time", whyWrong: "No." },
      ],
      hint: "Conditional on the null.",
      explanation: "P(data at least this extreme | H₀).",
    },
    {
      id: "sig-q-3",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "paired-tests",
      prompt: "Why is McNemar more powerful than a two-proportion test for comparing prompts on the same calls?",
      options: [
        { text: "It uses only discordant pairs, removing variance from call difficulty", correct: true },
        { text: "It uses more data", whyWrong: "It uses less (only discordant pairs)." },
        { text: "It assumes a larger effect", whyWrong: "No." },
        { text: "It ignores ties incorrectly", whyWrong: "Ignoring concordant pairs is correct here." },
      ],
      hint: "Easy calls are right for both.",
      explanation: "Pairing controls for item difficulty.",
    },
    {
      id: "sig-q-4",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "sample-size",
      prompt: "Two identical prompts evaluated on 100 random calls each. How often might one beat the other by ≥ 3 points?",
      options: [
        { text: "Surprisingly often (roughly a quarter of the time or more)", correct: true },
        { text: "Never", whyWrong: "Sampling noise is large at n = 100." },
        { text: "Only if the model changes", whyWrong: "Noise alone suffices." },
        { text: "Exactly 5% of the time", whyWrong: "That's not how α works here." },
      ],
      hint: "Run the simulator.",
      explanation: "SE of a difference ≈ 5.7 points at 80% and n = 100.",
    },
    {
      id: "sig-q-5",
      kind: "mcq",
      difficulty: "Advanced",
      concept: "significance",
      prompt: "A change is significant (p = 0.001) with a +0.4-point gain on 50,000 calls. Should you ship?",
      options: [
        { text: "Depends on practical value vs cost/risk — significance ≠ importance", correct: true },
        { text: "Yes, p is tiny", whyWrong: "Large n makes tiny effects significant." },
        { text: "No, 0.4 is always meaningless", whyWrong: "Could matter at scale; judge value." },
        { text: "Only if p < 0.0001", whyWrong: "Tighter p doesn't answer the value question." },
      ],
      hint: "Effect size.",
      explanation: "Weigh effect size, cost and risk.",
    },
  ],
  challenge: {
    id: "sig-ch-1",
    kind: "numeric",
    exType: "applied",
    difficulty: "Expert",
    concept: "confidence-intervals",
    prompt: "Accuracy 170/200. Compute the normal-approximation 95% CI half-width (1.96·√(p(1−p)/n)) in percentage points (1 decimal).",
    answer: 4.9,
    tolerance: 0.1,
    unit: "pts",
    hint: "p = 0.85.",
    explanation: "√(0.85·0.15/200) = √0.0006375 ≈ 0.02525; × 1.96 ≈ 0.0495 → **±4.9 points**. (Wilson gives a slightly shifted [79.4%, 89.3%].)",
  },
  code: {
    title: "Wilson CI, McNemar and paired bootstrap",
    code: `import numpy as np
from scipy.stats import binomtest
from statsmodels.stats.proportion import proportion_confint

print("Wilson 95% CI for 170/200:", np.round(proportion_confint(170, 200, method="wilson"), 3))

b, c = 18, 34   # A-only correct, B-only correct
print("McNemar exact p:", round(binomtest(b, b + c, 0.5).pvalue, 4))

rng = np.random.default_rng(0)
a = rng.random(400) < 0.81
bb = np.where(rng.random(400) < 0.87, a, rng.random(400) < 0.85)
diffs = [bb[i].mean() - a[i].mean() for i in (rng.integers(0, 400, 400) for _ in range(2000))]
print("paired bootstrap 95% CI (B-A):", np.round(np.percentile(diffs, [2.5, 97.5]), 3))
`,
  },
  related: ["gold-set-design", "error-analysis", "model-selection"],
  terms: ["confidence-interval", "statistical-significance", "p-value", "mcnemar", "paired-test", "bootstrap", "statistical-power", "sample-size"],
};
