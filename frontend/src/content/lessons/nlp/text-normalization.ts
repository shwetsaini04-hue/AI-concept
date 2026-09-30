import type { Lesson } from "../../types";

export const textNormalization: Lesson = {
  slug: "text-normalization",
  module: "nlp",
  order: 2,
  title: "Text Normalization",
  tagline: "Making noisy transcripts consistent — without destroying the signal you need.",
  difficulty: "Beginner",
  minutes: 30,
  stages: ["normalization"],
  why: `ASR output for the same sentence varies wildly: \`personal lon\`, \`persnal loan\`, \`PL\`; \`chahiye\`, \`chaiye\`, \`chahie\`; \`5 lakh\`, \`five lac\`, \`50 L\` (which is ten times more!). Keyword rules, fuzzy matching, entity extraction and even LLM prompts behave more predictably on consistent input.

But **[[normalization]] is lossy by design**. Every step deletes a distinction: lowercasing merges "US" and "us"; stripping punctuation turns "10.5" into "10 5"; stop-word removal deletes "nahi" and flips the meaning. The engineering skill is choosing which distinctions you can afford to lose — and keeping the original text for evidence.`,
  concepts: [
    {
      title: "The normalization ladder",
      intuition: `Think of normalization as a ladder from "exactly what was said" to "what it means":

1. **Basic**: case, whitespace, repeated punctuation.
2. **Spelling**: fix known misspellings (\`lon → loan\`).
3. **[[Romanization|romanization]]**: pick one spelling per Hindi word (\`chaiye → chahiye\`).
4. **Semantic**: numbers, abbreviations, canonical phrases (\`five lac → 500000\`, \`PL → personal loan\`).

Each rung up makes matching easier and throws more information away.`,
      technical: `Normalization is a composition of functions f_k ∘ … ∘ f_1 applied to text. Deterministic steps (Unicode NFKC, case folding, regex canonicalization, dictionary lookups) are cheap, auditable and reproducible. Learned steps (spelling correction models, transliteration models, LLM rewriting) handle the long tail but add variance.

Because the functions don't commute, **order matters**: number parsing must run before punctuation stripping (otherwise "10.5" → "10 5"), and entity protection (names) must run before spelling correction.`,
      example: `\`sir mujhe PL chahiye... personal lon ke liye\`
→ basic: \`sir mujhe pl chahiye… personal lon ke liye\`
→ spelling: \`… personal loan ke liye\`
→ abbreviation: \`sir mujhe personal loan chahiye… personal loan ke liye\`
→ semantic frame: \`[REQUEST product=personal_loan]\` — hedges, politeness and repetition are gone.`,
    },
    {
      title: "When normalization destroys information",
      intuition: `A normalizer is a compression algorithm with no undo button. If a distinction matters to any downstream consumer — negation for intent, "?" for dialogue acts, exact numbers for extraction, casing for names — normalizing it away creates errors nobody can recover later.`,
      technical: `Classic destructive cases: stop-word lists containing negators (\`not\`, \`nahi\`, \`mat\`); punctuation stripping before decimal/range parsing ("5-6 lakh"); dictionary correction over named entities ("Lon" the person → "loan"); context-free abbreviation expansion ("PL" = profit & loss in a business context); repetition collapsing that removes emphasis/hesitation cues.

The robust pattern is **non-destructive normalization**: keep \`original_text\`, add \`normalized_text\` and structured fields (\`amount=500000\`), and keep a character-offset map so evidence spans can always be quoted from the original.`,
      example: `\`mujhe loan nahi chahiye\` + stop-word removal → \`mujhe loan chahiye\` — a refusal became a request. Toggle "Stop-word removal" in the lab and watch the negation test fail.`,
    },
  ],
  questions: {
    what: "Transformations that map many surface variants of text to a canonical form: case, whitespace, punctuation, spelling, transliteration, abbreviations, numbers, and sometimes meaning-level frames.",
    why: "ASR and informal writing produce unbounded variation. Downstream matching, counting and extraction need consistency.",
    problem: "It reduces sparsity: fewer distinct strings for the same thing, so rules, dictionaries, fuzzy matchers and classifiers generalize better.",
    how: "A pipeline of ordered functions — regexes, lookup tables, transliteration maps, number grammars, and optionally learned models — each with a clear input/output contract.",
    onRealData: "Hinglish transcripts mix scripts and spellings (`chahiye/chaiye`), write numbers as words (`five lac`), use abbreviations (`PL`, `EMI`) and repeat fillers (`haan haan`). Most of these are enumerable; some (sarcasm, hedging) are not normalizable at all.",
    whatCanGoWrong: "Destroying negation, decimals, ranges, question marks, names and emphasis; wrong expansions of ambiguous abbreviations; order-dependent bugs; losing the ability to quote the original evidence.",
    howToEvaluate: "Build a labelled set of (raw, expected normalized) pairs including adversarial cases; measure exact-match accuracy per rule. More importantly, measure downstream F1 with and without each step (ablation).",
    whenToUse: "For deterministic, well-specified variation (numbers, units, known spellings) and before matching/counting. Keep it conservative before an LLM — LLMs already handle much surface variation.",
    whenNotToUse: "Don't apply aggressive steps (stop-words, punctuation stripping) before intent classification; don't normalize the text you'll quote as evidence.",
    downstream: "Normalization choices change what NER can find, what fuzzy matching matches, token counts and cost, and whether evidence quotes can be verified against the original transcript.",
  },
  lab: {
    id: "text-normalization",
    title: "Progressive normalization playground",
    intro: "Toggle normalization stages on a noisy utterance, see exactly what each step changed, then run a battery of information-preservation tests against your pipeline.",
    modes: ["computed"],
  },
  realWorld: {
    text: `A team added "standard NLP preprocessing" (lowercase, strip punctuation, remove stop-words) before their intent classifier. Accuracy on the aggregate dropped only 2 points, so it shipped. Error analysis later showed that recall on *Not Interested* had collapsed on Hinglish calls: "nahi chahiye" had become "chahiye". The aggregate hid it because refusals were a minority class.

The fix: remove stop-word removal entirely, keep punctuation, run number normalization into a separate structured field, and quote evidence from the original text.`,
    transcript: [
      { speaker: "Agent", text: "sir aapko loan chahiye?" },
      { speaker: "Customer", text: "nahi nahi, abhi nahi chahiye" },
    ],
  },
  mistakes: [
    { mistake: "Copy-pasting a generic 'NLP preprocessing' recipe", why: "Stop-word lists and punctuation stripping were designed for bag-of-words search, not intent or evidence tasks.", fix: "Start from zero steps; add each step only when an ablation shows a downstream gain." },
    { mistake: "Normalizing in the wrong order", why: "Stripping punctuation before number parsing breaks decimals and ranges; correcting spelling before protecting names corrupts them.", fix: "Parse numbers and protect entities first; write order-sensitive test cases." },
    { mistake: "Overwriting the original text", why: "You can no longer quote verbatim evidence or debug what the customer actually said.", fix: "Store original + normalized text + an offset map." },
    { mistake: "Context-free abbreviation expansion", why: "“PL” is personal loan in retail calls and profit & loss in business calls.", fix: "Expand only unambiguous abbreviations, or let the model interpret them in context." },
  ],
  decision: {
    question: "How much normalization should come before an LLM?",
    useWhen: [
      "The variation is enumerable and the mapping is exact (numbers, units, known misspellings of product names)",
      "You need structured, comparable fields (amount in ₹) for analytics",
      "Fuzzy matching or keyword rules run downstream",
    ],
    avoidWhen: [
      "The downstream model is an LLM that already handles spelling variation — aggressive steps only remove signal",
      "The text will be quoted as evidence",
      "A step touches negation, punctuation or casing that carries meaning",
    ],
    tradeoffs: [
      { a: "Normalization", b: "Information preservation", note: "Every step trades recall for matching against loss of nuance. Keep both representations." },
      { a: "Rules", b: "Learned normalizers", note: "Rules are exact and auditable but miss the long tail; models cover the tail but can hallucinate corrections." },
      { a: "Normalize early", b: "Normalize late", note: "Early normalization simplifies every stage but propagates its errors everywhere; late (field-level) normalization limits the blast radius." },
    ],
  },
  exercises: [
    {
      id: "norm-ex-1",
      kind: "mcq",
      exType: "conceptual",
      difficulty: "Beginner",
      concept: "normalization-info-loss",
      prompt: "Which preprocessing step is MOST likely to flip the meaning of `mujhe abhi loan nahi chahiye`?",
      options: [
        { text: "Stop-word removal", correct: true },
        { text: "Lowercasing", whyWrong: "The sentence is already lowercase; no information lost here." },
        { text: "Whitespace normalization", whyWrong: "Collapsing spaces doesn't change words." },
        { text: "Romanization normalization (chaiye → chahiye)", whyWrong: "That only canonicalizes spelling." },
      ],
      hint: "Which of these deletes whole words — and which word carries the negation?",
      explanation: "Typical stop-word lists include negators (`not`, `nahi`). Removing them turns a refusal into a request. This is why stop-word removal is rarely appropriate for intent tasks.",
    },
    {
      id: "norm-ex-2",
      kind: "numeric",
      exType: "applied",
      difficulty: "Beginner",
      concept: "romanization",
      prompt: "A customer says their loan requirement is **`50 L`**. Normalize it to an integer amount in rupees.",
      answer: 5000000,
      tolerance: 0,
      unit: "₹",
      hint: "L = lakh. 1 lakh = 100,000.",
      explanation: "50 lakh = 50 × 100,000 = **5,000,000**. Note the trap: lowercasing first turns `L` into `l`, which a case-sensitive shorthand rule won't recognise — another ordering bug.",
    },
    {
      id: "norm-ex-3",
      kind: "text",
      exType: "engineering",
      difficulty: "Intermediate",
      concept: "normalization-order",
      prompt: "Design a normalization pipeline (ordered steps) for transcripts that will feed (1) an amount extractor and (2) an LLM intent classifier that must quote evidence. Explain what you keep and what you avoid.",
      rubric: [
        { idea: "Keep the original text for evidence quoting", keywords: ["original", "raw", "verbatim", "keep both", "offset"] },
        { idea: "Parse numbers before stripping punctuation / order matters", keywords: ["before", "order", "first parse", "decimal", "numbers first"] },
        { idea: "Avoid stop-word removal (negation)", keywords: ["stop-word", "stopword", "stop word", "negation", "nahi"] },
        { idea: "Normalize amounts into a structured field", keywords: ["field", "structured", "integer", "amount=", "500000", "separate"] },
        { idea: "Measure with an ablation / downstream evaluation", keywords: ["ablation", "measure", "evaluate", "f1", "test cases"] },
      ],
      minIdeas: 3,
      hint: "Two consumers with different needs: one wants canonical numbers, the other wants untouched words to quote.",
      modelAnswer:
        "1) Keep raw text unchanged (for quoting) and build a normalized copy with an offset map. 2) Unicode/whitespace cleanup. 3) Parse numbers/ranges into structured fields BEFORE any punctuation handling (five lac → 500000, 5-6 lakh → [500000, 600000]). 4) Canonicalize known spellings/romanizations for matching only. 5) No stop-word removal, no punctuation stripping, no lowercasing of the text sent to the LLM. Validate each step with test cases and an ablation on downstream F1.",
      explanation: "Different consumers need different representations. The robust design keeps the original, adds structured fields, and applies only exact, well-tested transformations.",
    },
  ],
  quiz: [
    {
      id: "norm-q-1",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "romanization",
      prompt: "`chahiye`, `chaiye`, `chahie`, `chahye` are best described as…",
      options: [
        { text: "Romanization variants of the same Hindi word", correct: true },
        { text: "Four different words with different meanings", whyWrong: "They are spelling variants of one word ('need')." },
        { text: "ASR hallucinations", whyWrong: "They are normal informal transliteration, not hallucinations." },
        { text: "Abbreviations", whyWrong: "They are full words in different spellings." },
      ],
      hint: "Hindi has no standard Latin spelling.",
      explanation: "Informal romanization has no standard, so one word appears in many spellings. Keyword lists must cover variants or be normalized.",
    },
    {
      id: "norm-q-2",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "normalization-order",
      prompt: "Your pipeline strips punctuation, then parses numbers. What happens to `rate 10.5 percent`?",
      options: [
        { text: "It becomes '10 5' before parsing, so the rate is lost or wrong", correct: true },
        { text: "Nothing — number parsers ignore punctuation", whyWrong: "The decimal point IS punctuation; once removed, the number is gone." },
        { text: "It becomes 105%", whyWrong: "Plausible outcome of a different bug, but here the tokens become '10' and '5'." },
        { text: "The percent sign is preserved", whyWrong: "'percent' is a word here; the problem is the decimal point." },
      ],
      hint: "What character does a decimal number depend on?",
      explanation: "Order matters: parse numbers (and ranges) first, then touch punctuation — or better, don't strip punctuation at all.",
    },
    {
      id: "norm-q-3",
      kind: "multi",
      difficulty: "Intermediate",
      concept: "normalization-info-loss",
      prompt: "Which of these normalization steps can destroy information an intent classifier needs? (Select all)",
      options: [
        { text: "Removing stop-words including 'nahi'", correct: true },
        { text: "Collapsing 'haan haan haan' into 'haan'", correct: true },
        { text: "Removing '?' marks", correct: true },
        { text: "Converting 'five lac' into a separate amount field while keeping the text", whyWrong: "Adding a structured field while keeping the original loses nothing." },
      ],
      hint: "Three of these delete something; one only adds.",
      explanation: "Negation, emphasis/hesitation and question marks all carry intent signal. Adding structured fields alongside the original is non-destructive.",
    },
    {
      id: "norm-q-4",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "normalization-info-loss",
      prompt: "Why should evidence quotes come from the ORIGINAL transcript rather than the normalized one?",
      options: [
        { text: "Evidence must be verifiable against what was actually said", correct: true },
        { text: "Normalized text is always longer", whyWrong: "Length isn't the issue." },
        { text: "LLMs can't read normalized text", whyWrong: "They can; the issue is auditability." },
        { text: "Normalized text has more tokens", whyWrong: "Often fewer; irrelevant to verifiability." },
      ],
      hint: "Who reads evidence, and what are they checking?",
      explanation: "Reviewers and verifiers check quotes against the recording/transcript. A normalized paraphrase can't be matched and may carry normalization errors.",
    },
    {
      id: "norm-q-5",
      kind: "mcq",
      difficulty: "Advanced",
      concept: "normalization-order",
      prompt: "A business customer says `PL ka statement bhej do`. Your normalizer expands `PL → personal loan`. What's the best fix?",
      options: [
        { text: "Only expand unambiguous abbreviations, or expand in context (e.g., let the LLM interpret)", correct: true },
        { text: "Expand every abbreviation more aggressively", whyWrong: "More expansion means more wrong expansions." },
        { text: "Lowercase first", whyWrong: "Casing doesn't resolve the ambiguity." },
        { text: "Remove all abbreviations from transcripts", whyWrong: "That destroys information." },
      ],
      hint: "PL can mean profit & loss.",
      explanation: "Context-free expansion of ambiguous abbreviations creates confident errors. Restrict to unambiguous ones or resolve in context.",
    },
  ],
  challenge: {
    id: "norm-ch-1",
    kind: "json",
    exType: "engineering",
    difficulty: "Advanced",
    concept: "normalization-order",
    prompt: "Write the normalized record for the utterance `budget 5-6 lac ka hai, 3 saal ke liye` as JSON with fields `original` (unchanged string), `amount_min`, `amount_max` (integers in ₹) and `tenure_months` (integer).",
    starter: `{
  "original": "",
  "amount_min": 0,
  "amount_max": 0,
  "tenure_months": 0
}`,
    checks: [
      { label: "original is the unchanged utterance", test: (v) => v?.original === "budget 5-6 lac ka hai, 3 saal ke liye" },
      { label: "amount_min = 500000", test: (v) => v?.amount_min === 500000 },
      { label: "amount_max = 600000", test: (v) => v?.amount_max === 600000 },
      { label: "tenure_months = 36", test: (v) => v?.tenure_months === 36 },
    ],
    hint: "A range needs two numbers. 3 saal = 3 years.",
    modelAnswer: `{
  "original": "budget 5-6 lac ka hai, 3 saal ke liye",
  "amount_min": 500000,
  "amount_max": 600000,
  "tenure_months": 36
}`,
    explanation: "Ranges must be parsed as ranges (not '56 lakh' or '5 600000'), units applied to both ends, and the original kept verbatim for evidence.",
  },
  code: {
    title: "A non-destructive normalizer in Python",
    code: `import re

WORD_NUM = {"ek":1,"do":2,"teen":3,"paanch":5,"five":5,"das":10,"pachas":50}
UNIT = {"lakh":100_000,"lac":100_000,"lakhs":100_000,"crore":10_000_000,"hazaar":1_000}

def parse_amounts(text):
    pat = r"(\\d+(?:\\.\\d+)?|" + "|".join(WORD_NUM) + r")(?:\\s*-\\s*(\\d+))?\\s*(" + "|".join(UNIT) + r")\\b"
    out = []
    for m in re.finditer(pat, text, flags=re.I):
        lo = float(m.group(1)) if m.group(1)[0].isdigit() else WORD_NUM[m.group(1).lower()]
        hi = float(m.group(2)) if m.group(2) else lo
        mult = UNIT[m.group(3).lower()]
        out.append({"span": m.group(0), "min": int(lo*mult), "max": int(hi*mult)})
    return out

for utt in ["around five lac", "budget 5-6 lac ka hai", "2.5 lakh chahiye", "mujhe loan nahi chahiye"]:
    print(f"{utt!r:32} -> {parse_amounts(utt)}   (original kept)")
`,
  },
  related: ["tokenization", "fuzzy-matching", "ner"],
  terms: ["normalization", "romanization", "hinglish", "code-switching", "asr"],
};
