import type { Lesson } from "../../types";

export const hallucination: Lesson = {
  slug: "hallucination",
  module: "llm",
  order: 6,
  title: "Hallucination",
  tagline: "Fabricated entities, invented numbers, overconfident inferences — and how to catch each type.",
  difficulty: "Intermediate",
  minutes: 30,
  stages: ["verification", "evidence"],
  why: `A **[[hallucination]]** in transcript analysis is any output content not supported by — or contradicting — what was said. It's dangerous because it's fluent: “customer works at Infosys” sounds as factual as “customer works at an IT company in Pune”.

Different hallucinations have different causes and different defences. A fabricated bank name needs a quote-existence check; “5 crore” instead of “50 lakh” needs deterministic number normalization; “will apply next month” from “might consider” needs an abstain option and entailment checks. Categorizing is the first step to preventing.`,
  concepts: [
    {
      title: "A taxonomy of transcript hallucinations",
      intuition: `- **Fabricated entity**: a name, bank or employer that was never said.
- **Unsupported claim**: an extra fact with no basis ("already has a loan elsewhere").
- **Incorrect inference**: a conclusion stronger than the evidence ("might" → "will").
- **Missing evidence**: the cited support doesn't actually support (agent's leading question).
- **Contradiction**: the transcript says the opposite (objection later resolved).
- **Numerical hallucination**: wrong numbers or units (lakh/crore, 10× errors).`,
      technical: `Intrinsic hallucinations contradict the source; extrinsic hallucinations add unverifiable content. Causes include priors from pretraining (plausible completions like famous company names), pressure to answer (no abstain option), long/noisy contexts, and unit ambiguity. Detection stack: quote existence + speaker checks (fabrication, missing evidence), NLI/verifier (inference, contradiction), deterministic parsing of numbers from cited spans (numerical), and schema ranges (absurd values).`,
      example: `Transcript: “pachas… fifty lakh approx, 50 L”. Output: “home loan of 5 crore”. 50 lakh = 0.5 crore → numerical hallucination (unit confusion), caught by re-parsing the cited span.`,
    },
    {
      title: "Supported, unsupported, contradicted, insufficient",
      intuition: `Judge the answer against the transcript:
- **Supported** — everything in the answer is backed.
- **Unsupported** — it adds specifics that aren't there.
- **Contradicted** — the transcript says otherwise.
- **Insufficient evidence** — its conclusion goes beyond what the transcript establishes.`,
      technical: `These verdicts map to claim-level faithfulness checks. Decompose the answer into atomic claims, verify each against the transcript (NLI or LLM verifier with citations), and aggregate: any contradicted claim → contradicted; else any unsupported → unsupported; else any not-entailed inference → insufficient; else supported. Claim decomposition makes long answers checkable.`,
      example: `“Customer is interested and asked for a callback at 6 pm” → callback: supported; interested: not entailed → overall *insufficient evidence* with an incorrect-inference flag.`,
    },
  ],
  questions: {
    what: "Model output content that is not supported by the source transcript (or contradicts it).",
    why: "LLMs generate plausible continuations; plausibility isn't truth, especially under pressure to answer.",
    problem: "Detecting and preventing it keeps downstream decisions tied to what customers actually said.",
    how: "Prevention: abstain options, evidence requirements, low temperature, deterministic parsing. Detection: quote checks, verifiers, claim decomposition, ranges.",
    onRealData: "Indian number units (lakh/crore), vague employer mentions, third-party references and hedges are hallucination magnets.",
    whatCanGoWrong: "Verifiers that share the generator's blind spots, checks that only test existence (not entailment), and treating 'no hallucination detected' as 'correct'.",
    howToEvaluate: "Label a sample of outputs per claim (supported/unsupported/contradicted/insufficient), report rates by category and slice.",
    whenToUse: "Always check for hallucination on customer-facing or decision-driving outputs.",
    whenNotToUse: "Don't rely on the generator to self-report hallucinations without verification.",
    downstream: "Hallucinated amounts misprice offers; fabricated employers corrupt eligibility; invented intent creates false leads.",
  },
  lab: {
    id: "hallucination",
    title: "Hallucination spotting",
    intro: "Eleven model answers to real transcripts. Judge each as Supported / Unsupported / Contradicted / Insufficient Evidence, classify the hallucination type, then reveal the evidence.",
    modes: ["precomputed"],
  },
  realWorld: {
    text: `An auto-generated CRM note said “Customer employed at TCS, salary 12 LPA”. The call only said “IT company” and never mentioned salary. The note was used for eligibility pre-checks. After an audit found 7% of notes contained fabricated specifics, the team switched to extracting fields with verbatim evidence spans, rejected any field whose evidence didn't contain the value, and let employer be null when unspecified.`,
  },
  mistakes: [
    { mistake: "Letting the model fill every field", why: "Pressure to fill → plausible fabrication.", fix: "Allow null / insufficient evidence explicitly." },
    { mistake: "Checking quote existence only", why: "A real quote can still fail to support the claim.", fix: "Add entailment verification per claim." },
    { mistake: "Trusting numbers the model normalized itself", why: "Unit errors (lakh/crore) are common.", fix: "Extract the span; normalize numbers deterministically in code." },
  ],
  decision: {
    question: "Where do you invest in hallucination defence?",
    useWhen: ["Fields that drive money or compliance (amounts, rates, consent)", "Free-text notes that humans will trust", "Outputs shown to customers"],
    avoidWhen: ["Don't build heavy verifiers for low-stakes aggregate analytics — sample-audit instead"],
    tradeoffs: [
      { a: "Verification stage", b: "Latency & cost", note: "A verifier call adds cost; deterministic checks first catch much for free." },
      { a: "Abstention", b: "Coverage", note: "Allowing null reduces hallucination but lowers fill rate; that's usually the right trade." },
    ],
  },
  exercises: [
    {
      id: "hal-ex-1",
      kind: "mcq",
      exType: "applied",
      difficulty: "Beginner",
      concept: "hallucination-types",
      transcript: [
        { speaker: "Agent", text: "Are you salaried or self-employed?" },
        { speaker: "Customer", text: "Salaried, I work at an IT company in Pune." },
      ],
      prompt: "Model output: “Customer works at Infosys in Pune.” Which hallucination type?",
      options: [
        { text: "Fabricated entity", correct: true },
        { text: "Numerical hallucination", whyWrong: "No numbers involved." },
        { text: "Contradiction", whyWrong: "The transcript doesn't say it's not Infosys — it just doesn't say which company." },
        { text: "None — Infosys is an IT company in Pune", whyWrong: "Plausible ≠ said." },
      ],
      hint: "Was 'Infosys' ever said?",
      explanation: "A specific, plausible entity was invented.",
    },
    {
      id: "hal-ex-2",
      kind: "mcq",
      exType: "applied",
      difficulty: "Intermediate",
      concept: "hallucination-types",
      transcript: [
        { speaker: "Agent", text: "sir loan amount kitna chahiye" },
        { speaker: "Customer", text: "pachas... fifty lakh approx, 50 L" },
      ],
      prompt: "Output: “amount: 5 crore”. Verdict and type?",
      options: [
        { text: "Contradicted — numerical hallucination (50 lakh = 0.5 crore)", correct: true },
        { text: "Supported — 50 L means 5 crore", whyWrong: "1 crore = 100 lakh, so 50 lakh = 0.5 crore." },
        { text: "Insufficient evidence", whyWrong: "The amount is stated clearly." },
        { text: "Fabricated entity", whyWrong: "It's a number error." },
      ],
      hint: "1 crore = 100 lakh.",
      explanation: "A 10× unit error. Normalize numbers in code from the quoted span.",
    },
    {
      id: "hal-ex-3",
      kind: "text",
      exType: "engineering",
      difficulty: "Advanced",
      concept: "hallucination-types",
      prompt: "Map each hallucination type to one concrete defence: fabricated entity, numerical, incorrect inference, missing evidence.",
      rubric: [
        { idea: "Fabricated entity → require verbatim quote / check it exists", keywords: ["quote", "exists", "verbatim", "string match"] },
        { idea: "Numerical → deterministic parsing/normalization from the span, ranges", keywords: ["deterministic", "parse", "normaliz", "code", "range"] },
        { idea: "Incorrect inference → abstain option + entailment check", keywords: ["abstain", "insufficient", "entail", "nli", "verifier"] },
        { idea: "Missing evidence → speaker check / evidence must support claim", keywords: ["speaker", "customer turn", "agent", "support"] },
      ],
      minIdeas: 3,
      hint: "Each type has a characteristic check.",
      modelAnswer:
        "Fabricated entity → every entity must have a verbatim evidence span that string-matches the transcript. Numerical → extract the span and convert with deterministic code (lakh/crore rules) plus schema ranges. Incorrect inference → offer insufficient_evidence and run an entailment verifier on the claim. Missing evidence → reject evidence from the wrong speaker (e.g., agent questions for customer claims) and check the quote entails the claim.",
      explanation: "Targeted defences beat a generic 'don't hallucinate' instruction.",
    },
    {
      id: "hal-ex-4",
      kind: "mcq",
      exType: "conceptual",
      difficulty: "Intermediate",
      concept: "hallucination-types",
      prompt: "Why do LLMs produce fluent fabrications, like a specific employer name that was never mentioned?",
      options: [
        { text: "They generate plausible continuations from learned patterns; without an abstain option or grounding checks, plausibility fills the gap", correct: true },
        { text: "They look up a company database", whyWrong: "Nothing is looked up; the name is generated." },
        { text: "They only hallucinate at high temperature", whyWrong: "Hallucinations occur at temperature 0 too." },
        { text: "Because the transcript was in Hinglish", whyWrong: "Language can make it more likely, but it's not the mechanism." },
      ],
      hint: "What is the model optimized to produce?",
      explanation: "Language models produce likely text, and likely ≠ true. Give them a way to say 'unknown' and verify every specific claim against the source.",
    },
  ],
  quiz: [
    {
      id: "hal-q-1",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "hallucination-types",
      prompt: "“The customer will apply next month” from “I might consider it next month” is…",
      options: [
        { text: "An incorrect inference (too strong)", correct: true },
        { text: "Fully supported", whyWrong: "'Might consider' ≠ 'will apply'." },
        { text: "A fabricated entity", whyWrong: "No entity invented." },
        { text: "A numerical hallucination", whyWrong: "No number." },
      ],
      hint: "Compare the strength of the two statements.",
      explanation: "The conclusion exceeds the evidence.",
    },
    {
      id: "hal-q-2",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "hallucination-types",
      prompt: "Which prevention step most directly reduces 'forced guess' hallucinations?",
      options: [
        { text: "Allowing null / insufficient_evidence outputs", correct: true },
        { text: "Higher temperature", whyWrong: "More randomness, more fabrication." },
        { text: "Longer prompts", whyWrong: "Not directly." },
        { text: "Removing the evidence field", whyWrong: "Removes a detection mechanism." },
      ],
      hint: "Give the model a way out.",
      explanation: "Abstain options remove the pressure to fabricate.",
    },
    {
      id: "hal-q-3",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "hallucination-types",
      prompt: "An evidence quote exists verbatim in the transcript. Is the claim therefore supported?",
      options: [
        { text: "Not necessarily — the quote must also entail the claim and be from the right speaker", correct: true },
        { text: "Yes, always", whyWrong: "Real quotes can support a different claim." },
        { text: "Only if it's long", whyWrong: "Length is irrelevant." },
        { text: "Only in English", whyWrong: "Language is irrelevant." },
      ],
      hint: "Existence ≠ support.",
      explanation: "Existence, speaker and entailment are separate checks.",
    },
    {
      id: "hal-q-4",
      kind: "multi",
      difficulty: "Intermediate",
      concept: "hallucination-types",
      prompt: "Which are hallucinations relative to the transcript? (Select all)",
      options: [
        { text: "Adding the customer's salary when none was mentioned", correct: true },
        { text: "Naming the brother 'Rohit' when no name was given", correct: true },
        { text: "Reporting 'rejected due to EMI' when the objection was later resolved", correct: true },
        { text: "Reporting 'asked for a callback at 6 pm' when they said 'shaam ko 6 baje call karo'", whyWrong: "That's supported." },
      ],
      hint: "One is faithful.",
      explanation: "Unsupported additions, fabricated entities and contradictions are all hallucinations.",
    },
    {
      id: "hal-q-5",
      kind: "mcq",
      difficulty: "Advanced",
      concept: "hallucination-types",
      prompt: "Why decompose a long answer into atomic claims before verification?",
      options: [
        { text: "Each claim can be checked independently; one unsupported detail is otherwise hidden in an overall 'mostly right' answer", correct: true },
        { text: "It reduces token cost", whyWrong: "Usually increases cost." },
        { text: "Verifiers can only read short text", whyWrong: "Not the reason." },
        { text: "It improves the generator", whyWrong: "It's a verification technique." },
      ],
      hint: "Mixed answers.",
      explanation: "Claim-level checks catch partial hallucinations.",
    },
  ],
  challenge: {
    id: "hal-ch-1",
    kind: "numeric",
    exType: "applied",
    difficulty: "Advanced",
    concept: "hallucination-types",
    prompt: "An audit samples 400 outputs: 18 contain a fabricated entity, 9 a numerical hallucination, 25 an incorrect inference (some outputs have several types; 44 outputs have at least one). What is the **output-level hallucination rate** in percent?",
    answer: 11,
    tolerance: 0.1,
    unit: "%",
    hint: "Count outputs with at least one hallucination, not the sum of types.",
    explanation: "44 / 400 = **11%**. Summing types (52) double-counts outputs with multiple hallucinations.",
  },
  related: ["grounding", "structured-output", "llm-judge"],
  terms: ["hallucination", "faithfulness", "grounding", "entailment"],
};
