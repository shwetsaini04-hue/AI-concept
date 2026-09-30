import type { Lesson } from "../../types";

export const sampling: Lesson = {
  slug: "sampling",
  module: "llm",
  order: 7,
  title: "Sampling Parameters",
  tagline: "Temperature, top-p and max tokens: why the same prompt can give different answers.",
  difficulty: "Intermediate",
  minutes: 25,
  stages: ["classification"],
  why: `Run the same classification prompt twice and you may get “interested” then “insufficient_evidence”. That isn't the model changing its mind — it's **sampling**. Each output token is drawn from a probability distribution, and the decoding parameters reshape that distribution.

For extraction and classification, variability is noise you pay for in inconsistent labels and flaky evaluations. For brainstorming, it's a feature. Knowing exactly what **[[temperature]]**, **[[top-p]]** and **[[max tokens|max-tokens]]** do lets you choose deliberately.`,
  concepts: [
    {
      title: "Temperature",
      technical: `The model outputs [[logits]] z_i for every candidate token. Sampling uses p_i = exp(z_i / T) / Σ_j exp(z_j / T). T < 1 sharpens the distribution (the top token gets more mass); T > 1 flattens it (lower-ranked tokens gain probability); as T → 0 it approaches greedy argmax decoding. Temperature rescales *all* logits — it changes the whole distribution, not just the top token.`,
      intuition: `Think of temperature as changing how strongly the model prefers its most likely next token. Low temperature: “stick to your favourite”. High temperature: “give the runners-up a real chance”.`,
      example: `Logits interested 3.2, unclear 2.4, not 2.0. At T = 1: ≈0.57 / 0.26 / 0.17 (among these three). At T = 0.3: ≈0.92 / 0.06 / 0.02. At T = 2: ≈0.45 / 0.30 / 0.25 — labels now flip between runs.`,
    },
    {
      title: "Top-p (nucleus) and max tokens",
      intuition: `**Top-p** keeps only the most likely tokens that together make up p of the probability (e.g., 90%) and throws away the long tail of weird options. **Max tokens** is a hard cap on output length — hit it and the answer stops mid-sentence, or mid-JSON.`,
      technical: `Nucleus sampling: sort probabilities descending, keep the minimal prefix with cumulative mass ≥ p, renormalize, sample. It adapts the candidate set size to the model's confidence (small when peaked, large when flat). max_tokens bounds generated tokens; providers report a stop reason (e.g., length vs end-of-turn) that you should check before parsing.`,
      example: `With p = 0.9, “pizza” (tail probability ≈ 0.3%) can never be sampled. With max_tokens = 20, a JSON object with a long “reason” field is cut off → invalid output.`,
    },
    {
      title: "Determinism in practice",
      intuition: `Temperature 0 means “always take the top token” — so outputs should be identical. In real APIs they're *mostly* identical but not guaranteed, because the numbers computed on shared hardware can differ slightly from run to run.`,
      technical: `Sources of nondeterminism at T = 0: floating-point non-associativity under different batch compositions, kernel choices, mixture-of-experts routing ties, and silent model/infrastructure updates. Near-ties between top tokens are where tiny numeric differences flip outputs. Mitigate with pinned model versions, output logging, and evaluation over repeated runs when consistency matters.`,
      example: `A label whose top-2 logits differ by 0.001 can flip between “interested” and “insufficient_evidence” across calls even at T = 0 — typically on genuinely ambiguous calls, which is itself a useful signal.`,
    },
  ],
  questions: {
    what: "Decoding parameters that control how tokens are chosen from the model's next-token distribution and how long generation runs.",
    why: "LLMs define distributions, not single answers; decoding turns distributions into text.",
    problem: "They let you trade diversity for consistency and bound cost/length.",
    how: "Temperature rescales logits before softmax; top-p truncates to a probability nucleus; max_tokens caps length.",
    onRealData: "Ambiguous calls (hedges, sarcasm) have flat label distributions — exactly where sampling produces inconsistent labels.",
    whatCanGoWrong: "High temperature → inconsistent labels and fabrications; low max_tokens → truncated JSON; assuming T = 0 is perfectly deterministic.",
    howToEvaluate: "Run each input several times; measure label agreement across runs, unique outputs, and truncation (stop reason) rates.",
    whenToUse: "Low temperature for classification/extraction; higher for ideation or when sampling multiple candidates deliberately (self-consistency).",
    whenNotToUse: "Don't raise temperature to 'fix' a wrong answer; don't set tight max_tokens with long structured outputs.",
    downstream: "Sampling variance shows up as evaluation noise, flaky regressions and inconsistent decisions for the same call.",
  },
  lab: {
    id: "sampling",
    title: "Sampling laboratory",
    intro: "Move temperature and top-p and watch a next-token distribution reshape. Generate repeated outputs from a tiny language model and measure diversity and truncation. Optionally repeat a real model call 5× at your temperature.",
    modes: ["computed", "simulated", "real-model"],
  },
  realWorld: {
    text: `An evaluation dashboard showed prompt v7 beating v6 by 1.5 points — then losing by 1 point the next day, with nothing changed. Both ran at temperature 0.7. Re-running at temperature 0 with three repeats per call showed the two versions were indistinguishable; the day-to-day swings were sampling noise on the ~12% of genuinely ambiguous calls.`,
  },
  mistakes: [
    { mistake: "Default temperature (often 1.0) for classification", why: "Labels flip on ambiguous inputs; evaluations become noisy.", fix: "Use T = 0 or low; measure run-to-run agreement." },
    { mistake: "Believing temperature = 'creativity knob' only", why: "It reshapes the entire distribution, including the label decision.", fix: "Think in probabilities: which tokens gain mass?" },
    { mistake: "Ignoring stop reasons", why: "Truncated outputs get parsed as if complete.", fix: "Check the stop reason; size max_tokens with headroom." },
  ],
  decision: {
    question: "What decoding settings should a transcript classifier use?",
    useWhen: ["T = 0 (or ≤ 0.2) for classification and extraction", "Moderate T with multiple samples for self-consistency confidence estimates", "Top-p ~0.9–1.0 when sampling; max_tokens sized for your longest valid output"],
    avoidWhen: ["High temperature for single-shot decisions", "Tight max_tokens with verbose reasoning fields"],
    tradeoffs: [
      { a: "Consistency", b: "Diversity", note: "Low T maximizes repeatability; sampling several higher-T outputs can estimate uncertainty." },
      { a: "Longer outputs", b: "Cost & truncation", note: "Reasoning fields help audits but cost tokens and raise truncation risk." },
    ],
  },
  exercises: [
    {
      id: "smp-ex-1",
      kind: "mcq",
      exType: "conceptual",
      difficulty: "Beginner",
      concept: "temperature",
      prompt: "Increasing temperature from 0.2 to 1.5 generally…",
      options: [
        { text: "Flattens the distribution, giving lower-ranked tokens more probability", correct: true },
        { text: "Makes the model more knowledgeable", whyWrong: "Temperature doesn't change knowledge." },
        { text: "Only affects output length", whyWrong: "That's max_tokens." },
        { text: "Sharpens the distribution", whyWrong: "That's lowering temperature." },
      ],
      hint: "Divide logits by a larger number.",
      explanation: "p_i ∝ exp(z_i/T); larger T shrinks differences between logits.",
    },
    {
      id: "smp-ex-2",
      kind: "numeric",
      exType: "applied",
      difficulty: "Intermediate",
      concept: "top-p",
      prompt: "Token probabilities: A 0.50, B 0.25, C 0.15, D 0.06, E 0.04. With top-p = 0.85, how many tokens remain in the nucleus?",
      answer: 3,
      tolerance: 0,
      hint: "Add probabilities from the top until you reach ≥ 0.85.",
      explanation: "0.50 → 0.75 → 0.90 ≥ 0.85 after three tokens: A, B, C remain, renormalized by 0.90.",
    },
    {
      id: "smp-ex-3",
      kind: "text",
      exType: "engineering",
      difficulty: "Advanced",
      concept: "determinism",
      prompt: "Your nightly regression test sometimes fails at T = 0 on the same inputs. Explain why and how you'd make the test meaningful.",
      rubric: [
        { idea: "T=0 isn't perfectly deterministic (floating point / batching / infra)", keywords: ["floating", "batch", "nondetermin", "infrastructure", "not guaranteed", "hardware"] },
        { idea: "Flips happen on near-ties / ambiguous inputs", keywords: ["near-tie", "tie", "ambiguous", "close logits", "borderline"] },
        { idea: "Run multiple repeats / aggregate, test on rates not single outputs", keywords: ["repeat", "multiple runs", "several", "aggregate", "rate", "majority"] },
        { idea: "Pin model versions and log outputs", keywords: ["pin", "version", "log"] },
      ],
      minIdeas: 2,
      hint: "Why can the top token change without any code change?",
      modelAnswer:
        "At T = 0 decoding is greedy, but computed logits can vary slightly with batch composition, kernels and infrastructure, so near-tied tokens flip. Make tests statistical: run k repeats, assert on aggregate metrics with tolerances (and CIs), track per-item flip rates (flippers are often genuinely ambiguous calls worth reviewing), and pin/log model versions so real regressions are distinguishable.",
      explanation: "Treat LLM outputs as samples; test distributions, not single strings.",
    },
  ],
  quiz: [
    {
      id: "smp-q-1",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "temperature",
      prompt: "As temperature → 0, decoding approaches…",
      options: [
        { text: "Greedy decoding (always the top token)", correct: true },
        { text: "Uniform random sampling", whyWrong: "That's T → ∞." },
        { text: "Beam search", whyWrong: "Different algorithm." },
        { text: "Top-p = 0.5", whyWrong: "Different parameter." },
      ],
      hint: "Divide logits by a tiny number.",
      explanation: "Differences blow up; the argmax takes all probability.",
    },
    {
      id: "smp-q-2",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "top-p",
      prompt: "Top-p adapts the number of candidate tokens because…",
      options: [
        { text: "When the model is confident, few tokens reach p; when uncertain, many do", correct: true },
        { text: "It always keeps exactly p × vocabulary tokens", whyWrong: "That's not how nucleus sampling works." },
        { text: "It removes the top token", whyWrong: "It keeps the top tokens." },
        { text: "It depends on max_tokens", whyWrong: "Unrelated." },
      ],
      hint: "Cumulative probability.",
      explanation: "The nucleus is the smallest set covering mass p.",
    },
    {
      id: "smp-q-3",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "temperature",
      prompt: "Best temperature for extracting amounts and intent labels:",
      options: [
        { text: "0 or close to it", correct: true },
        { text: "1.0 (default)", whyWrong: "Adds label variance." },
        { text: "1.5 for creativity", whyWrong: "Extraction shouldn't be creative." },
        { text: "Random per call", whyWrong: "No." },
      ],
      hint: "Consistency matters.",
      explanation: "Low temperature maximizes consistency for deterministic tasks.",
    },
    {
      id: "smp-q-4",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "determinism",
      prompt: "Identical prompts at temperature 0.8 return different labels. Most accurate explanation:",
      options: [
        { text: "Each call samples from the same distribution; different draws can yield different tokens", correct: true },
        { text: "The model learned between calls", whyWrong: "No online learning occurs." },
        { text: "The prompt was cached differently", whyWrong: "Caching doesn't change outputs." },
        { text: "The tokenizer changed", whyWrong: "No." },
      ],
      hint: "Sampling.",
      explanation: "Same distribution, different random draws.",
    },
    {
      id: "smp-q-5",
      kind: "mcq",
      difficulty: "Advanced",
      concept: "temperature",
      prompt: "Which statement about temperature is most precise?",
      options: [
        { text: "It rescales logits before softmax, reshaping the whole next-token distribution", correct: true },
        { text: "It controls randomness", whyWrong: "True-ish but imprecise — it doesn't say how." },
        { text: "It sets how many tokens are generated", whyWrong: "That's max_tokens." },
        { text: "It controls how much the model knows", whyWrong: "No." },
      ],
      hint: "Technical + intuitive.",
      explanation: "p_i ∝ exp(z_i/T): it changes how strongly the model prefers its top token.",
    },
  ],
  challenge: {
    id: "smp-ch-1",
    kind: "numeric",
    exType: "applied",
    difficulty: "Expert",
    concept: "temperature",
    prompt: "Two labels have logits 2.0 (interested) and 1.0 (insufficient). What is P(interested) at **T = 0.5**? (softmax over just these two; 3 decimals)",
    answer: 0.881,
    tolerance: 0.002,
    hint: "p = e^(2/0.5) / (e^(2/0.5) + e^(1/0.5)) = 1 / (1 + e^(−2)).",
    explanation: "Scaled logits 4 and 2 → P = 1/(1 + e^−2) ≈ **0.881**. At T = 1 it would be 1/(1 + e^−1) ≈ 0.731.",
  },
  code: {
    title: "Temperature and top-p on a toy distribution",
    code: `import numpy as np

tokens = ["interested", "unclear", "not", "maybe", "pizza"]
logits = np.array([3.2, 2.4, 2.0, 1.3, -2.5])

def dist(T, p=1.0):
    z = logits / max(T, 1e-6)
    probs = np.exp(z - z.max()); probs /= probs.sum()
    order = np.argsort(-probs); keep = np.zeros_like(probs, bool); cum = 0
    for i in order:
        keep[i] = True; cum += probs[i]
        if cum >= p: break
    probs = np.where(keep, probs, 0); return probs / probs.sum()

rng = np.random.default_rng(0)
for T in [0.01, 0.5, 1.0, 1.5]:
    samples = rng.choice(tokens, size=20, p=dist(T, p=0.95))
    print(f"T={T:<4}  P={np.round(dist(T), 3)}  unique labels in 20 draws: {len(set(samples))}")
`,
  },
  related: ["model-selection", "calibration", "structured-output"],
  terms: ["temperature", "top-p", "logits", "softmax", "greedy-decoding", "max-tokens"],
};
