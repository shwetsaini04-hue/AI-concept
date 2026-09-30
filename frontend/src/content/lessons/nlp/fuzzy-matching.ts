import type { Lesson } from "../../types";

export const fuzzyMatching: Lesson = {
  slug: "fuzzy-matching",
  module: "nlp",
  order: 3,
  title: "Fuzzy Matching",
  tagline: "Matching “persnal lon” to “personal loan” — and knowing when a close match is the wrong match.",
  difficulty: "Beginner",
  minutes: 30,
  stages: ["normalization", "ner"],
  why: `Noisy transcripts rarely contain the exact strings in your product catalogue, bank list or compliance script. **[[Fuzzy matching|fuzzy-matching]]** bridges the gap with a similarity score and a threshold.

The threshold is where engineering happens. Too low and "professional loan" matches "personal loan"; too high and "pesonal lone" is missed. That's a precision/recall trade-off — the same one you'll meet again in classification metrics — and it can only be set by measuring on labelled pairs.`,
  concepts: [
    {
      title: "Edit distance: Levenshtein and friends",
      intuition: `How many single-character fixes turn one string into another? \`persnal\` → \`personal\` needs one insertion, so the distance is 1. Divide by the longer length to get a similarity between 0 and 1.`,
      technical: `**[[Levenshtein distance|levenshtein]]** is the minimum number of insertions, deletions and substitutions, computed by dynamic programming: D[i][j] = min(D[i−1][j]+1, D[i][j−1]+1, D[i−1][j−1] + [a_i ≠ b_j]), O(mn) time. **Damerau-Levenshtein** also counts adjacent transpositions ("laon" → "loan") as one edit. Normalized similarity = 1 − d / max(|a|, |b|).`,
      example: `\`persnal loan\` vs \`personal loan\`: distance 1, similarity 1 − 1/13 ≈ 0.92. \`professional loan\` vs \`personal loan\`: distance 5, similarity ≈ 0.71 — close enough to fool a low threshold.`,
    },
    {
      title: "Jaro-Winkler, n-grams and token-level similarity",
      intuition: `Different similarity measures notice different things:
- **[[Jaro-Winkler|jaro-winkler]]** rewards a shared beginning — great for names.
- **Character n-gram [[Jaccard|jaccard]]** compares overlapping chunks — robust to small typos anywhere.
- **Token similarity** compares words — robust to word order ("loan personal") but blind to typos inside words.`,
      technical: `Jaro = ⅓(m/|a| + m/|b| + (m − t)/m) with m matching characters within a window of ⌊max(|a|,|b|)/2⌋ − 1 and t half the transpositions; Winkler adds ℓ·p·(1 − J) for a common prefix ℓ ≤ 4, p = 0.1. Character n-gram Jaccard = |G(a) ∩ G(b)| / |G(a) ∪ G(b)| over padded n-grams. Token-sort ratio sorts tokens before comparing, making it order-invariant.`,
      example: `\`loan personal\` vs \`personal loan\`: Levenshtein similarity is low (the characters are in different places), token-sort ratio is 1.0. \`Rahul\` vs \`Rahool\`: Jaro-Winkler is high thanks to the shared prefix "Rah".`,
    },
    {
      title: "Thresholds are a precision/recall decision",
      intuition: `Every threshold splits pairs into "match" and "no match". Raising it removes false matches (higher precision) but misses more real variants (lower recall). There is no universally correct value — only a value that's right for the cost of each error.`,
      technical: `Given labelled pairs (x_i, y_i, match_i) and a score s_i, the predicted match is s_i ≥ τ. Sweep τ to trace precision(τ) and recall(τ), choose τ by a business-weighted objective (e.g., F-β or expected cost). Always evaluate on held-out pairs: τ tuned on the same pairs overfits.`,
      example: `In the lab, "two wheeler loan" should match "vehicle loan" but no lexical similarity can see it — that's a synonym, not a typo. It stays a false negative at every threshold: a signal that you need a different tool (a synonym table or embeddings).`,
    },
  ],
  questions: {
    what: "Approximate string matching: scoring how similar two strings are and deciding a match above a threshold.",
    why: "Real text never matches your dictionaries exactly — misspellings, ASR substitutions, word order and spacing all vary.",
    problem: "It recovers matches that exact lookup misses, e.g. mapping noisy product mentions to a catalogue or spotting a scripted compliance phrase.",
    how: "Compute a similarity (edit distance, Jaro-Winkler, n-gram or token overlap) between a mention and each candidate, pick the best, and accept it if above a threshold.",
    onRealData: "`persnal lon`, `personal lawn` (ASR), `loan personal` (order), `credit crd` — all real variants of catalogue entries; `hold on` vs `gold loan` is a dangerous near-miss.",
    whatCanGoWrong: "Short strings produce high similarity by chance; different products differ by one word; synonyms are invisible; a threshold tuned on one dataset breaks on another; comparing against a huge dictionary increases false positives.",
    howToEvaluate: "Label candidate pairs as match/no-match, sweep the threshold, and report precision/recall at the chosen operating point on a held-out set.",
    whenToUse: "Known closed vocabularies (products, banks, cities, scripted phrases), deduplication, and as a cheap first-pass before heavier models.",
    whenNotToUse: "When meaning matters more than spelling (synonyms, paraphrase) — use embeddings or an LLM; when strings are very short and ambiguous.",
    downstream: "Fuzzy matches feed NER (gazetteer entities), normalization (canonical product names) and compliance detection; a wrong threshold silently inflates or deflates every downstream count.",
  },
  lab: {
    id: "fuzzy-matching",
    title: "Fuzzy matching lab",
    intro: "Compare two strings with seven similarity measures and inspect the edit-distance DP matrix. Then sweep a threshold over labelled catalogue pairs and watch false positives and false negatives trade off.",
    modes: ["computed"],
  },
  realWorld: {
    text: `A compliance team must check that agents read the disclosure "rates are subject to change". ASR outputs "rates are subject to chains", "rate subject to change hai" and "rates r subjected to change". An exact match found 61% of disclosures; token-sort similarity with τ = 0.8 found 94% on a labelled sample of 200 calls, with 3 false positives from "rates are subject to your credit profile". The team kept τ = 0.8, added those false positives to a regression test, and re-measured monthly.`,
  },
  mistakes: [
    { mistake: "Picking a threshold by eyeballing a few examples", why: "You'll see only the easy cases; the error rate depends on the distribution of near-misses.", fix: "Label 100–300 pairs including hard negatives and sweep the threshold." },
    { mistake: "Using fuzzy matching for synonyms", why: "`two wheeler loan` and `vehicle loan` share little surface form.", fix: "Use a synonym table, embeddings or an LLM for meaning-level matches." },
    { mistake: "Ignoring string length", why: "Short strings (`EMI`, `PL`) reach high similarity with many unrelated strings.", fix: "Require exact match for very short strings or use a stricter threshold." },
    { mistake: "Matching against every word in a long transcript", why: "Many comparisons → many chance matches.", fix: "Restrict candidates (n-gram windows around keywords, the right speaker, the right segment)." },
  ],
  decision: {
    question: "When is fuzzy matching the right tool?",
    useWhen: ["The target vocabulary is closed and known", "Variation is mostly spelling/ASR noise", "You need cheap, explainable, deterministic matching"],
    avoidWhen: ["Matching must understand meaning (synonyms, paraphrase, negation)", "Strings are very short and ambiguous", "You can't label pairs to set a threshold"],
    tradeoffs: [
      { a: "Precision", b: "Recall", note: "The threshold moves you along this curve; choose it from business costs, not intuition." },
      { a: "Character-level", b: "Token-level", note: "Character measures handle typos; token measures handle word order. Combine when both occur." },
      { a: "Fuzzy matching", b: "Embeddings", note: "Fuzzy is cheap and exact-ish; embeddings capture meaning but are costlier and less predictable." },
    ],
  },
  exercises: [
    {
      id: "fuz-ex-1",
      kind: "numeric",
      exType: "applied",
      difficulty: "Beginner",
      concept: "edit-distance",
      prompt: "What is the Levenshtein distance between `lon` and `loan`?",
      answer: 1,
      tolerance: 0,
      hint: "Which single operation turns 'lon' into 'loan'?",
      explanation: "Insert 'a' after 'lo' → 'loan'. One insertion, distance 1.",
    },
    {
      id: "fuz-ex-2",
      kind: "mcq",
      exType: "conceptual",
      difficulty: "Intermediate",
      concept: "similarity-threshold",
      prompt: "You lower the fuzzy-match threshold from 0.9 to 0.7. What happens?",
      options: [
        { text: "More true variants match (recall ↑) but more wrong matches appear (precision ↓)", correct: true },
        { text: "Both precision and recall increase", whyWrong: "Lowering the bar admits more matches, both right and wrong." },
        { text: "Precision increases", whyWrong: "More pairs pass, so more false positives." },
        { text: "Nothing changes because similarity is symmetric", whyWrong: "Symmetry is unrelated to the threshold." },
      ],
      hint: "A lower bar lets more pairs through — which kinds?",
      explanation: "Threshold ↓ ⇒ recall ↑, precision ↓. Where to sit on this curve depends on the cost of each error type.",
    },
    {
      id: "fuz-ex-3",
      kind: "text",
      exType: "engineering",
      difficulty: "Intermediate",
      concept: "similarity-threshold",
      prompt: "Design a procedure to choose the fuzzy-match threshold for mapping product mentions to a catalogue of 40 products.",
      rubric: [
        { idea: "Collect and label candidate pairs (match / no match)", keywords: ["label", "annotat", "gold", "pairs"] },
        { idea: "Include hard negatives / near-misses", keywords: ["hard negative", "near-miss", "near miss", "similar but different", "professional"] },
        { idea: "Sweep thresholds and compute precision/recall", keywords: ["sweep", "precision", "recall", "curve", "f1"] },
        { idea: "Choose by business cost of FP vs FN", keywords: ["cost", "business", "false positive", "false negative", "f-beta"] },
        { idea: "Validate on held-out pairs", keywords: ["held-out", "held out", "test set", "validation", "separate"] },
      ],
      minIdeas: 3,
      hint: "Think about data, measurement, and how to pick the operating point.",
      modelAnswer:
        "Sample real mentions, generate top-k catalogue candidates, and label each pair match/no-match (including hard negatives like professional vs personal loan). Compute similarity per pair, sweep τ, plot precision/recall, and pick τ by the relative cost of wrong vs missed matches (or F-β). Confirm on a held-out set and re-check periodically as ASR or products change.",
      explanation: "A threshold is a model parameter: it needs labelled data, a sweep, a business-driven objective and held-out validation.",
    },
  ],
  quiz: [
    {
      id: "fuz-q-1",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "edit-distance",
      prompt: "Levenshtein distance counts…",
      options: [
        { text: "The minimum number of single-character insertions, deletions and substitutions", correct: true },
        { text: "The number of differing words", whyWrong: "That's closer to a token-level measure." },
        { text: "The number of shared characters", whyWrong: "That's an overlap measure." },
        { text: "The length difference", whyWrong: "Length difference is a lower bound, not the distance." },
      ],
      hint: "It's an 'edit' distance.",
      explanation: "Minimum-cost edit sequence with unit costs for insert/delete/substitute.",
    },
    {
      id: "fuz-q-2",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "jaro-winkler",
      prompt: "Why is Jaro-Winkler popular for matching person names?",
      options: [
        { text: "It gives a bonus for a shared prefix, and name typos tend to occur later in the string", correct: true },
        { text: "It understands phonetics", whyWrong: "That's Soundex/Metaphone; JW is character-based." },
        { text: "It ignores all vowels", whyWrong: "No." },
        { text: "It is always stricter than Levenshtein", whyWrong: "Not generally; it's a different measure." },
      ],
      hint: "What does the 'Winkler' part add?",
      explanation: "The Winkler modification boosts similarity for common prefixes (up to 4 chars).",
    },
    {
      id: "fuz-q-3",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "similarity-threshold",
      prompt: "`two wheeler loan` should match `vehicle loan`, but gets low similarity with every string measure. The right fix is…",
      options: [
        { text: "Add a synonym mapping or use semantic similarity (embeddings/LLM)", correct: true },
        { text: "Lower the threshold to 0.3", whyWrong: "That floods you with false positives." },
        { text: "Use Damerau-Levenshtein", whyWrong: "Transpositions don't create synonymy." },
        { text: "Lowercase both strings", whyWrong: "They're already lowercase; the issue is meaning." },
      ],
      hint: "Is this a spelling problem or a meaning problem?",
      explanation: "Lexical similarity can't see synonyms. Use a curated synonym list or meaning-level similarity.",
    },
    {
      id: "fuz-q-4",
      kind: "multi",
      difficulty: "Intermediate",
      concept: "similarity-threshold",
      prompt: "Which are good practices when deploying fuzzy matching? (Select all)",
      options: [
        { text: "Include hard negatives in your labelled pairs", correct: true },
        { text: "Restrict candidates (e.g., only customer turns, only the product field)", correct: true },
        { text: "Use a stricter rule for very short strings", correct: true },
        { text: "Tune the threshold on the same pairs you report results on", whyWrong: "That overfits the threshold and inflates your reported numbers." },
      ],
      hint: "One of these is an evaluation mistake.",
      explanation: "Hard negatives, candidate restriction and length-aware rules reduce false positives; report on held-out pairs.",
    },
    {
      id: "fuz-q-5",
      kind: "mcq",
      difficulty: "Advanced",
      concept: "edit-distance",
      prompt: "Which measure treats `loan personal` and `personal loan` as identical?",
      options: [
        { text: "Token-sort ratio", correct: true },
        { text: "Levenshtein similarity", whyWrong: "Character positions differ a lot." },
        { text: "Jaro-Winkler", whyWrong: "Prefix differs; order matters." },
        { text: "Hamming distance", whyWrong: "Requires equal lengths and is position-based." },
      ],
      hint: "Which measure sorts before comparing?",
      explanation: "Token-sort ratio sorts tokens alphabetically first, making it order-invariant.",
    },
  ],
  challenge: {
    id: "fuz-ch-1",
    kind: "numeric",
    exType: "applied",
    difficulty: "Advanced",
    concept: "similarity-threshold",
    prompt: "On 200 labelled pairs at threshold 0.8 you get TP = 72, FP = 8, FN = 18. Management says a missed product mention costs 3× a wrong one. Compute the **F-β score with β = √3 ≈ 1.732** (recall weighted 3× in the squared sense). Round to 3 decimals.",
    answer: 0.823,
    tolerance: 0.002,
    hint: "P = TP/(TP+FP), R = TP/(TP+FN). F_β = (1+β²)PR / (β²P + R) with β² = 3.",
    explanation: "P = 72/80 = 0.9, R = 72/90 = 0.8. F_β = (1+3)·0.9·0.8 / (3·0.9 + 0.8) = 2.88 / 3.5 ≈ **0.823**. Compare F1 = 0.847: weighting recall more pulls the score toward the weaker metric (recall), signalling you should lower the threshold.",
  },
  code: {
    title: "Threshold sweep in Python",
    code: `from difflib import SequenceMatcher

pairs = [  # (mention, catalogue entry, is_match)
    ("persnal loan", "personal loan", 1), ("personal lawn", "personal loan", 1),
    ("hom loan", "home loan", 1), ("credit crd", "credit card", 1),
    ("professional loan", "personal loan", 0), ("hold on", "gold loan", 0),
    ("credit score", "credit card", 0), ("home loan", "gold loan", 0),
]
scores = [(SequenceMatcher(None, a, b).ratio(), y) for a, b, y in pairs]
for t in [0.6, 0.7, 0.8, 0.9]:
    tp = sum(s >= t and y for s, y in scores); fp = sum(s >= t and not y for s, y in scores)
    fn = sum(s < t and y for s, y in scores)
    p = tp / (tp + fp) if tp + fp else 0; r = tp / (tp + fn) if tp + fn else 0
    print(f"t={t:.1f}  precision={p:.2f}  recall={r:.2f}")
`,
  },
  related: ["phonetic-matching", "text-normalization", "classification-metrics"],
  terms: ["fuzzy-matching", "levenshtein", "edit-distance", "jaro-winkler", "jaccard", "n-gram"],
};
