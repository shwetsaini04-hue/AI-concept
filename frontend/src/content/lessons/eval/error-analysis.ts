import type { Lesson } from "../../types";

export const errorAnalysis: Lesson = {
  slug: "error-analysis",
  module: "eval",
  order: 9,
  title: "Error Analysis",
  tagline: "Overall F1 0.81 — but 0.62 on noisy transcripts. Slicing and root-cause analysis turn metrics into a plan.",
  difficulty: "Advanced",
  minutes: 35,
  stages: ["evaluation"],
  why: `An aggregate metric is an average over very different situations. Clean English inbound calls and very noisy Romanized-Hindi outbound calls can differ by 30 points of F1 — and the aggregate hides which one you're failing.

**[[Error analysis|error-analysis]]** slices performance by metadata (agent, call type, language, quality, duration, segment, model, prompt version), reads failures, forms hypotheses and tests them. The discipline is separating a *symptom* ("Agent B's calls fail") from a *root cause* ("Agent B takes noisier calls").`,
  concepts: [
    {
      title: "Slicing",
      intuition: `Compute the metric separately for each group: per agent, per language, per transcript quality… The slices that are much worse than average — and big enough to matter — are where to look.`,
      technical: `A [[slice]] is a metadata-defined subset. Report per-slice n, precision, recall, F1 and a CI (bootstrap for F1). Small slices have wide intervals: rank by both effect size and impact (share of traffic × gap). Beware multiple comparisons: with many slices, some will look bad by chance — confirm on fresh data.`,
      example: `Overall F1 0.81. By quality: clean 0.90, noisy 0.74, very noisy 0.55. By agent: A 0.86, B 0.70, C 0.80. Both look like findings — only one is a cause.`,
    },
    {
      title: "Root cause vs confounders",
      intuition: `Agent B looks bad. But if Agent B mostly handles noisy outbound calls, the real problem may be audio quality, not the agent. Cross the two dimensions: if within each quality tier all agents score the same, quality is the cause and "agent" was a confounder.`,
      technical: `[[Root-cause analysis|root-cause-analysis]] tests hypotheses by controlling for confounders: cross-tabulate (agent × quality), stratify, or fit a simple model (e.g., logistic regression of correctness on slice features) to estimate adjusted effects. Then inspect failure examples in the suspect slice, categorize them (ASR error, sarcasm, diarization…), and validate the fix on that slice with a paired comparison.`,
      example: `Agent × quality cross-tab: clean — A 0.88, B 0.87, C 0.89; noisy — A 0.75, B 0.72, C 0.74. Agents are equivalent within tiers; B just gets 70% noisy calls. Fix ASR/normalization or the noisy-call prompt, not the agent.`,
    },
  ],
  questions: {
    what: "Systematically finding where and why a system fails by slicing metrics, reading errors and testing hypotheses.",
    why: "Aggregates hide failures; engineering effort needs a target.",
    problem: "It converts 'the model is 81%' into 'fix X for slice Y, worth Z points of business impact'.",
    how: "Slice by metadata, rank by gap × volume, cross-tab to control confounders, read and categorize failures, test fixes on the slice.",
    onRealData: "Transcript quality, language mix, agent, call type and duration are strong drivers; they're correlated with each other.",
    whatCanGoWrong: "Blaming confounded proxies (agents), chasing tiny slices, multiple-comparison false alarms, fixing symptoms not causes.",
    howToEvaluate: "Per-slice metrics with CIs; before/after comparisons on the target slice with paired tests.",
    whenToUse: "After every evaluation round, and whenever aggregate metrics move.",
    whenNotToUse: "Don't over-interpret slices with a handful of examples.",
    downstream: "Drives the roadmap: ASR work, prompt changes, routing rules, human-review targeting.",
  },
  lab: {
    id: "error-analysis",
    title: "Error-analysis dashboard",
    intro: "900 labelled predictions with rich metadata. Filter, slice by any dimension (with bootstrap CIs), cross-tabulate two dimensions, and answer the root-cause question about Agent B.",
    modes: ["simulated", "computed"],
  },
  realWorld: {
    text: `After a model upgrade, overall F1 rose 2 points and the team celebrated. Slicing showed F1 on Romanized-Hindi calls had *dropped* 6 points while English rose 4 — a real regression for 20% of customers, hidden by the mix. They shipped only after adding Romanized-Hindi few-shot examples and verifying the slice recovered.`,
  },
  mistakes: [
    { mistake: "Reporting only aggregate metrics", why: "Slices can regress while the aggregate improves.", fix: "Standard slice report with every evaluation." },
    { mistake: "Blaming the most visible dimension", why: "Correlated dimensions confound each other.", fix: "Cross-tabulate or model adjusted effects." },
    { mistake: "Acting on tiny slices", why: "Noise.", fix: "Show n and CIs; confirm on fresh data." },
    { mistake: "Not reading examples", why: "Numbers say where, not why.", fix: "Read and categorize 20–50 failures per suspect slice." },
  ],
  decision: {
    question: "Which slice should you work on first?",
    useWhen: ["Large gap × large traffic share × fixable cause", "Slices tied to business risk (compliance, high-value customers)"],
    avoidWhen: ["Tiny slices with wide CIs", "Proxies that are confounded by another dimension"],
    tradeoffs: [
      { a: "Fixing the worst slice", b: "Fixing the biggest slice", note: "Impact = gap × volume; a moderate gap on 45% of traffic can beat a huge gap on 2%." },
    ],
  },
  exercises: [
    {
      id: "ea-ex-1",
      kind: "mcq",
      exType: "applied",
      difficulty: "Intermediate",
      concept: "root-cause",
      prompt: "Agent B's F1 is 0.70 vs 0.86 for Agent A. Within clean calls both score ~0.88; within noisy calls both score ~0.73. Agent B handles 70% noisy calls. Root cause?",
      options: [
        { text: "Transcript quality; agent is a confounder", correct: true },
        { text: "Agent B needs retraining", whyWrong: "Within each tier, B performs like A." },
        { text: "Random noise", whyWrong: "The pattern is systematic." },
        { text: "Model bias against Agent B", whyWrong: "Per-tier results show no agent effect." },
      ],
      hint: "Compare within tiers.",
      explanation: "Controlling for quality removes the agent gap.",
    },
    {
      id: "ea-ex-2",
      kind: "numeric",
      exType: "applied",
      difficulty: "Intermediate",
      concept: "slicing",
      prompt: "Slice X: 45% of traffic, F1 0.70. Slice Y: 3% of traffic, F1 0.40. Overall F1 target 0.85. Using impact ≈ share × (0.85 − F1), what is slice X's impact score? (3 decimals)",
      answer: 0.0675,
      tolerance: 0.0005,
      hint: "0.45 × 0.15.",
      explanation: "X: 0.45 × 0.15 = **0.0675**. Y: 0.03 × 0.45 = 0.0135. X matters ~5× more despite the smaller gap.",
    },
    {
      id: "ea-ex-3",
      kind: "text",
      exType: "engineering",
      difficulty: "Advanced",
      concept: "root-cause",
      prompt: "F1 on Romanized-Hindi calls dropped 6 points after a model upgrade while overall rose. Describe your investigation and fix-validation plan.",
      rubric: [
        { idea: "Confirm with CI / enough examples / paired comparison", keywords: ["confidence interval", "ci", "paired", "mcnemar", "significan", "enough examples"] },
        { idea: "Read and categorize failures", keywords: ["read", "categor", "inspect", "examples", "failure types"] },
        { idea: "Check confounders (quality, agent, call type)", keywords: ["confound", "quality", "cross", "control"] },
        { idea: "Targeted fix (examples, normalization, routing)", keywords: ["few-shot", "example", "normaliz", "route", "prompt"] },
        { idea: "Validate on the slice and overall before shipping", keywords: ["validate", "re-evaluate", "slice", "before shipping", "regression"] },
      ],
      minIdeas: 3,
      hint: "Confirm → diagnose → fix → verify.",
      modelAnswer:
        "Confirm the drop is real: paired comparison of old vs new model on the same Romanized-Hindi calls (McNemar) with enough examples. Cross with quality/agent to rule out a mix change. Read ~40 new failures and categorize (transliteration variants, hedges, numbers). Apply a targeted fix — Romanized-Hindi few-shot examples or light normalization — and re-evaluate the slice and the overall set on dev, then confirm once on test.",
      explanation: "Error analysis is a loop, closed by validation on the slice.",
    },
    {
      id: "ea-ex-4",
      kind: "mcq",
      exType: "conceptual",
      difficulty: "Intermediate",
      concept: "slicing",
      prompt: "Why can overall F1 improve while an important customer segment gets worse?",
      options: [
        { text: "The aggregate is a traffic-weighted average; gains on large slices can mask losses on smaller ones", correct: true },
        { text: "F1 can't behave like that", whyWrong: "It can and frequently does." },
        { text: "Because of sampling temperature", whyWrong: "Unrelated." },
        { text: "Because slices use different metrics", whyWrong: "Same metric, different subsets." },
      ],
      hint: "Weighted averages.",
      explanation: "Always compare slices before and after a change, not just the aggregate.",
    },
  ],
  quiz: [
    {
      id: "ea-q-1",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "slicing",
      prompt: "A 'slice' is…",
      options: [
        { text: "A subset of data defined by metadata (e.g., language = Hinglish)", correct: true },
        { text: "A random sample", whyWrong: "Slices are defined by attributes." },
        { text: "A model layer", whyWrong: "No." },
        { text: "A training batch", whyWrong: "No." },
      ],
      hint: "Metadata-defined.",
      explanation: "Slices group examples by attributes.",
    },
    {
      id: "ea-q-2",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "slicing",
      prompt: "Overall F1 improves after an update, but one slice regresses. What happened?",
      options: [
        { text: "Gains on some slices outweighed losses on another in the aggregate", correct: true },
        { text: "Impossible", whyWrong: "Aggregates are weighted averages." },
        { text: "The slice metric is wrong", whyWrong: "Check it, but this is common." },
        { text: "Nothing to worry about", whyWrong: "That slice's users got worse service." },
      ],
      hint: "Weighted averages.",
      explanation: "Always check slices on updates.",
    },
    {
      id: "ea-q-3",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "root-cause",
      prompt: "A confounder is…",
      options: [
        { text: "A variable correlated with both the suspected cause and the outcome", correct: true },
        { text: "A labelling error", whyWrong: "Different concept." },
        { text: "A type of hallucination", whyWrong: "No." },
        { text: "A metric", whyWrong: "No." },
      ],
      hint: "Agent B ↔ noisy calls ↔ low F1.",
      explanation: "Confounders create spurious associations.",
    },
    {
      id: "ea-q-4",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "slicing",
      prompt: "A slice with n = 12 shows F1 0.40. Best reaction?",
      options: [
        { text: "Note it, check the CI (very wide), gather more examples before acting", correct: true },
        { text: "Immediately rebuild the model", whyWrong: "12 examples can't support that." },
        { text: "Ignore it forever", whyWrong: "It may be real." },
        { text: "Delete those calls", whyWrong: "No." },
      ],
      hint: "Uncertainty.",
      explanation: "Small slices need more data.",
    },
    {
      id: "ea-q-5",
      kind: "multi",
      difficulty: "Advanced",
      concept: "root-cause",
      prompt: "Which techniques help separate root causes from confounded proxies? (Select all)",
      options: [
        { text: "Cross-tabulating two dimensions", correct: true },
        { text: "Stratified comparisons within tiers", correct: true },
        { text: "A regression of correctness on several slice features", correct: true },
        { text: "Looking only at the worst slice", whyWrong: "That's where confounding misleads you." },
      ],
      hint: "Control for other variables.",
      explanation: "Adjust for confounders before concluding.",
    },
  ],
  challenge: {
    id: "ea-ch-1",
    kind: "mcq",
    exType: "engineering",
    difficulty: "Expert",
    concept: "slicing",
    prompt: "You check 40 slices and find 3 whose F1 is 'significantly' lower at p < 0.05. What's the main caution?",
    options: [
      { text: "With 40 tests, ~2 false positives are expected by chance — confirm on fresh data or correct for multiple comparisons", correct: true },
      { text: "p < 0.05 guarantees all three are real", whyWrong: "Not with multiple testing." },
      { text: "Slices can't be tested statistically", whyWrong: "They can." },
      { text: "Ignore p-values entirely", whyWrong: "Use them correctly instead." },
    ],
    hint: "40 × 0.05.",
    explanation: "Multiple comparisons inflate false discoveries; replicate or adjust (e.g., Holm/Benjamini-Hochberg).",
  },
  code: {
    title: "Slice report with pandas",
    code: `import numpy as np, pandas as pd

rng = np.random.default_rng(4)
n = 900
df = pd.DataFrame({
    "agent": rng.choice(["A","B","C"], n),
    "language": rng.choice(["English","Hinglish","Romanized Hindi"], n, p=[.25,.55,.2]),
})
df["quality"] = np.where(df.agent == "B", rng.choice(["clean","noisy"], n, p=[.3,.7]), rng.choice(["clean","noisy"], n, p=[.7,.3]))
df["correct"] = rng.random(n) < np.where(df.quality == "clean", 0.92, 0.76)

print("Accuracy by agent:\\n", df.groupby("agent").correct.mean().round(3), "\\n")
print("Agent x quality (controls for the confounder):\\n", df.pivot_table(index="agent", columns="quality", values="correct").round(3))
`,
  },
  related: ["per-stage-evaluation", "significance", "calibration"],
  terms: ["error-analysis", "slice", "root-cause-analysis", "confidence-interval"],
};
