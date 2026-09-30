import type { Lesson } from "../../types";

export const tokenization: Lesson = {
  slug: "tokenization",
  module: "nlp",
  order: 1,
  title: "Tokenization",
  tagline: "What the model actually reads — and why Hinglish transcripts can cost more to process.",
  difficulty: "Beginner",
  minutes: 25,
  stages: ["transcript", "decision"],
  why: `Every LLM call is priced, rate-limited and length-limited in **[[tokens|token]]**, not words. When you process 100,000 call transcripts a month, the difference between 1.3 and 2.5 tokens per word is the difference between a budget that works and one that doesn't.

Tokenization also decides what the model "sees". A misspelling like \`lon\` or a Romanized Hindi word like \`chahiye\` is split into fragments the model must reassemble. That affects cost, [[context window]] usage, latency, and how you [[chunk|chunking]] long calls.`,
  concepts: [
    {
      title: "Words vs tokens",
      intuition: `A tokenizer is a fixed dictionary of text pieces. Common pieces (\`" loan"\`, \`" the"\`) are single entries. Rare pieces get built from smaller ones, like spelling a rare word with Lego bricks.

So "tokens per word" is not a constant: it's low for frequent English and higher for rare spellings, other scripts, numbers and noise.`,
      technical: `Modern LLM tokenizers (e.g. byte-level [[BPE|bpe]]) first split text with a regex (roughly: words with their leading space, numbers, punctuation), then apply learned merge rules to the UTF-8 bytes of each chunk. The result is a sequence of integer **[[token IDs|token-id]]** indexing a fixed [[vocabulary]].

Because merges were learned from a training corpus, strings frequent in that corpus compress well; strings absent from it (Romanized Hindi, ASR misspellings) decompose into more pieces.`,
      example: `\`"I need a loan"\` and \`"mujhe loan chahiye"\` mean the same thing. Paste both into the lab: the English sentence has more words, but compare the **token** counts — the result depends on the tokenizer and the spelling, which is why you measure instead of assuming.`,
    },
    {
      title: "Subword algorithms: BPE and SentencePiece",
      intuition: `BPE learns its vocabulary by repeatedly gluing together the most common adjacent pair. After enough merges, frequent words become single tokens and rare words stay split.

SentencePiece is a toolkit that does this (or a related "Unigram" method) directly on raw text including spaces, so it doesn't need a language-specific word splitter.`,
      technical: `**BPE training**: start with a base alphabet (bytes), count adjacent pair frequencies over the corpus, merge the most frequent pair into a new symbol, repeat until the vocabulary reaches size V. **Encoding** applies merges by priority.

**[[SentencePiece|sentencepiece]]** treats the input as a raw Unicode stream, encodes whitespace as \`▁\`, and supports BPE or Unigram-LM (which keeps the vocabulary that maximizes corpus likelihood and prunes). It is widely used in multilingual models.`,
      example: `With a vocabulary trained mostly on English web text, \`" personal"\` is likely one token while \`" persnal"\` becomes 2–3. With a vocabulary trained on lots of Indian-language text, \`"chahiye"\` might be a single token. Different providers ⇒ different counts for the same transcript.`,
    },
    {
      title: "Token count → cost, context, latency, chunking",
      intuition: `Tokens are the unit of everything operational:
- **Cost**: you pay per input and output token.
- **Context**: the model can only hold so many tokens at once.
- **Latency**: more input tokens → longer time to first token.
- **Chunking**: if a call is too long, you split it by tokens — and a naive split can cut a number like "5 lakh" in half.`,
      technical: `Input cost ≈ (system + rules + examples + transcript tokens) × price_in; output cost ≈ generated tokens × price_out (usually several times price_in). Prefill compute grows with input length, so [[TTFT|ttft]] increases with prompt size. For chunking, split on semantic boundaries (turns, segments) with a token budget, and add overlap so evidence spanning a boundary isn't lost.`,
      example: `A 10-minute Hinglish call might be ~1,500–3,000 tokens depending on the tokenizer. Plus a 5,000-token rulebook, that's ~7,000 input tokens per call; at 100k calls/month that's ~700M input tokens. Try the cost calculator in the lab with your own numbers.`,
    },
  ],
  questions: {
    what: "Tokenization converts text into a sequence of integer IDs from a fixed vocabulary of subword units. Tokens, not words, are what the model processes.",
    why: "Neural models need a finite input alphabet. Word-level vocabularies can't handle unseen words; character-level sequences are too long. Subword tokenization is the compromise.",
    problem: "It solves the open-vocabulary problem: any string — misspellings, new product names, Hinglish — can be represented without an 'unknown' token.",
    how: "A pre-tokenization regex splits text; a learned merge table (BPE) or likelihood-pruned vocabulary (Unigram) maps each chunk's bytes to the longest/most-probable known pieces, which are looked up to IDs.",
    onRealData: "Noisy transcripts contain misspellings (`lon`), Romanized Hindi (`chahiye`, `kitna`), repeated fillers (`haan haan`) and spelled-out numbers (`five lac`). These typically produce more tokens per word than clean English — measure it in the lab.",
    whatCanGoWrong: "Budget estimates based on word counts; context overflow on long calls; naive chunking that splits numbers or turns; assuming token counts are identical across providers; assuming a fixed multilingual 'penalty'.",
    howToEvaluate: "Measure tokens per call on a representative sample (by language and quality tier) with the tokenizer of the model you'll use. Track p50/p95 tokens per call, not just the mean.",
    whenToUse: "Always count tokens with the target model's tokenizer when estimating cost, setting max input length, designing chunking, or choosing a model with enough context.",
    whenNotToUse: "Don't use one provider's tokenizer to budget another provider's model, and don't treat token counts as a measure of 'information content'.",
    downstream: "Token counts drive cost per decision, the choice between single-call and multi-stage pipelines, whether you need chunking/retrieval, and caching strategy (static prefix size).",
  },
  lab: {
    id: "tokenization",
    title: "Interactive tokenizer",
    intro: "Type or paste any text. See the real tokens, their IDs, the count and an estimated cost — then compare English, Hindi, Hinglish, Romanized Hindi and a noisy transcript side by side.",
    modes: ["real-local", "computed"],
  },
  realWorld: {
    text: `A collections team wants to classify 200,000 calls/month. Their first estimate used "average 800 words per call × $X per 1k words". Measured with the model's tokenizer, noisy Hinglish calls averaged far more tokens per word than their English test set, and the p95 call was 4× the median. The budget and the context-window plan both had to change.

The fix wasn't a new model: they (1) measured tokens per call by language slice, (2) trimmed the rulebook and put it in a cached prefix, and (3) chunked long calls by conversation segment instead of fixed token windows.`,
    transcript: [
      { speaker: "Agent", text: "hello sir kaise help karu" },
      { speaker: "Customer", text: "sir mujhe ek personal lon chahiye" },
      { speaker: "Agent", text: "ji sir kitne ka chahiye" },
      { speaker: "Customer", text: "around five lac" },
    ],
  },
  mistakes: [
    {
      mistake: "Estimating cost from word counts",
      why: "Tokens per word varies widely with language, script, spelling and numbers.",
      fix: "Tokenize a stratified sample with the target model's tokenizer and budget on p95, not the mean.",
    },
    {
      mistake: "Assuming all providers count the same",
      why: "Each model family has its own vocabulary; the same transcript can differ substantially in token count.",
      fix: "Use each provider's token-counting tool/endpoint when comparing models on cost.",
    },
    {
      mistake: "Fixed-size chunking",
      why: "Cutting every N tokens splits numbers (`5 la|kh`), turns and question→answer pairs.",
      fix: "Chunk on turn/segment boundaries within a token budget, with overlap.",
    },
    {
      mistake: "Hard-coding a 'Hinglish costs X% more' rule",
      why: "The ratio depends on the tokenizer, the spelling conventions and the content. It changes when the provider updates its tokenizer.",
      fix: "Measure periodically and store token counts per call in your logs.",
    },
  ],
  decision: {
    question: "When does tokenization need explicit engineering attention?",
    useWhen: [
      "Estimating cost or rate limits for high-volume transcript processing",
      "Calls can approach the model's [[context window]] (long calls + rulebook + examples)",
      "Designing chunking or segment selection for long transcripts",
      "Comparing providers — count with each provider's tokenizer",
    ],
    avoidWhen: [
      "Low-volume prototypes where cost is negligible — just log token usage",
      "Using token counts as a proxy for meaning or quality",
    ],
    tradeoffs: [
      { a: "Normalizing text to English", b: "Keeping original Hinglish", note: "Fewer tokens can mean lower cost, but translation/normalization can destroy nuance (hedges, negation). Measure both cost and accuracy." },
      { a: "Long context", b: "Cost", note: "Stuffing the whole call + full rulebook is simple but expensive per call; caching and trimming reduce it." },
      { a: "Fixed-size chunks", b: "Segment-based chunks", note: "Fixed chunks are simple; segment chunks preserve question→answer pairs and evidence." },
    ],
  },
  exercises: [
    {
      id: "tok-ex-1",
      kind: "mcq",
      exType: "conceptual",
      difficulty: "Beginner",
      concept: "tokens-vs-words",
      prompt: "Why can `persnal lon` produce more tokens than `personal loan`, even though it has fewer characters?",
      options: [
        { text: "Misspellings are rare in the tokenizer's training data, so they are split into more subword pieces.", correct: true },
        { text: "The tokenizer counts characters, and misspelled words have hidden characters.", whyWrong: "Tokenizers don't count characters; they map byte sequences to learned vocabulary entries." },
        { text: "Tokenizers add a special error token for every misspelling.", whyWrong: "There is no 'misspelling token'; byte-level BPE can represent any string without special error tokens." },
        { text: "It can't — fewer characters always means fewer tokens.", whyWrong: "Token count depends on vocabulary coverage, not character count." },
      ],
      hint: "Think about how BPE builds its vocabulary: from frequent pairs in a training corpus.",
      explanation: "BPE merges are learned from frequency. `personal` and `loan` (with a leading space) are frequent in web text and become single tokens; `persnal` and `lon` are rare and decompose into several pieces. Fewer characters can still mean more tokens.",
    },
    {
      id: "tok-ex-2",
      kind: "numeric",
      exType: "applied",
      difficulty: "Intermediate",
      concept: "token-cost",
      prompt: "You process **100,000** calls. Each call sends a 5,000-token rulebook plus a 1,500-token transcript. Input price is **$3 per 1M tokens**. What is the total input cost in dollars (no caching)?",
      answer: 1950,
      tolerance: 1,
      unit: "$",
      hint: "Total input tokens = calls × (rulebook + transcript). Then divide by 1,000,000 and multiply by the price.",
      explanation: "100,000 × 6,500 = 650,000,000 tokens = 650 × 1M. 650 × $3 = **$1,950**. Notice the rulebook is 77% of that — which is why prompt caching matters (see the caching lesson).",
    },
    {
      id: "tok-ex-3",
      kind: "text",
      exType: "engineering",
      difficulty: "Intermediate",
      concept: "token-cost",
      prompt: "Your calls average 2,000 tokens but some reach 30,000. Your model has a 16k-token context and your rulebook is 4k tokens. Describe how you would handle long calls **without losing evidence**.",
      rubric: [
        { idea: "Chunk or split long calls", keywords: ["chunk", "split", "segment", "window"] },
        { idea: "Split on turn/segment boundaries rather than fixed token counts", keywords: ["turn", "boundary", "boundaries", "segment", "speaker"] },
        { idea: "Use overlap or carry context between chunks", keywords: ["overlap", "carry", "context from previous", "sliding"] },
        { idea: "Aggregate/merge chunk-level results", keywords: ["aggregate", "merge", "combine", "reduce", "final decision"] },
        { idea: "Measure token counts (p95) / budget", keywords: ["p95", "measure", "budget", "count tokens", "percentile"] },
      ],
      minIdeas: 3,
      hint: "Think: where to cut, how not to lose question→answer pairs at the cut, and how to combine results.",
      modelAnswer:
        "Budget: 16k − 4k rulebook − output reserve ≈ 11k tokens per chunk. Split long calls on turn/segment boundaries (never mid-turn) into ≤11k-token chunks with 1–2 turns of overlap so question→answer pairs survive the cut. Run extraction per chunk, then aggregate (e.g., latest explicit intent wins, collect all evidence spans, flag conflicts for review). Alternatively select relevant segments (discovery/closing) first. Track p95 tokens per call so the budget stays valid.",
      explanation: "Good answers split on semantic boundaries, preserve adjacency pairs with overlap, and define an aggregation rule. Fixed-size chunking without overlap is the classic way to lose the one line of evidence that mattered.",
    },
  ],
  quiz: [
    {
      id: "tok-q-1",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "tokens-vs-words",
      prompt: "What does an LLM actually receive as input?",
      options: [
        { text: "A sequence of integer token IDs", correct: true },
        { text: "A list of words", whyWrong: "Words are split into subword tokens first; the model never sees 'words' as units." },
        { text: "Raw characters", whyWrong: "Byte-level tokenizers start from bytes but merge them into tokens before the model sees them." },
        { text: "Sentence embeddings", whyWrong: "Embeddings are computed inside the model from token IDs." },
      ],
      hint: "What does the tokenizer output?",
      explanation: "The tokenizer maps text to integer IDs; the model looks up an embedding for each ID.",
    },
    {
      id: "tok-q-2",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "multilingual-tokenization",
      prompt: "A colleague says: “Hinglish always costs exactly 40% more than English.” What's the best response?",
      options: [
        { text: "The ratio depends on the tokenizer, spelling and content — measure it on your own transcripts.", correct: true },
        { text: "Correct — this is a known constant.", whyWrong: "There is no universal constant; different tokenizers and texts give different ratios." },
        { text: "Hinglish is always cheaper because words are shorter.", whyWrong: "Shorter words don't imply fewer tokens; rare spellings often split into more pieces." },
        { text: "Token counts are identical across languages.", whyWrong: "They vary a lot by language and script." },
      ],
      hint: "Could the answer change if you switched models?",
      explanation: "Token counts are an empirical property of (tokenizer × text). Always measure with the model you'll use.",
    },
    {
      id: "tok-q-3",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "tokens-vs-words",
      prompt: "In byte-level BPE, why can a single Devanagari character correspond to more than one token?",
      options: [
        { text: "Devanagari characters are multiple UTF-8 bytes, and the vocabulary may not contain merges covering all of them.", correct: true },
        { text: "The tokenizer translates Hindi into English first.", whyWrong: "Tokenizers don't translate." },
        { text: "Hindi is not supported, so each character becomes an 'unknown' token.", whyWrong: "Byte-level BPE has no unknown token; everything is representable as bytes." },
        { text: "Every character is always exactly one token.", whyWrong: "Only if the vocabulary contains that character's byte sequence as a single entry." },
      ],
      hint: "How many bytes does a Devanagari character take in UTF-8?",
      explanation: "Devanagari code points take 3 bytes in UTF-8. If the learned merges don't cover them, a character spans several byte-level tokens — visible as dashed outlines in the lab.",
    },
    {
      id: "tok-q-4",
      kind: "multi",
      difficulty: "Intermediate",
      concept: "token-cost",
      prompt: "Which of these increase with the number of **input** tokens? (Select all)",
      options: [
        { text: "Input cost", correct: true },
        { text: "Time to first token (prefill latency)", correct: true },
        { text: "Risk of exceeding the context window", correct: true },
        { text: "The model's vocabulary size", whyWrong: "The vocabulary is fixed by the tokenizer; it doesn't change per request." },
      ],
      hint: "Three are per-request quantities; one is a fixed property of the tokenizer.",
      explanation: "Input tokens drive cost, prefill latency and context usage. Vocabulary size is fixed.",
    },
    {
      id: "tok-q-5",
      kind: "mcq",
      difficulty: "Advanced",
      concept: "token-cost",
      prompt: "You split a 20k-token call into fixed 4k-token chunks. What is the most likely failure?",
      options: [
        { text: "A question in one chunk and its answer in the next are separated, so evidence is lost or misread.", correct: true },
        { text: "The model refuses to process chunks.", whyWrong: "Chunks are just shorter inputs." },
        { text: "Token IDs change between chunks.", whyWrong: "IDs for the same text are deterministic; the problem is the boundary, not the IDs." },
        { text: "Chunking always improves accuracy.", whyWrong: "Chunking can help with length but often hurts by separating context." },
      ],
      hint: "Think about adjacency pairs: 'aap salaried ho?' → 'haan'.",
      explanation: "A bare 'haan' in chunk 2 is uninterpretable without the question at the end of chunk 1. Split on turn/segment boundaries with overlap.",
    },
  ],
  challenge: {
    id: "tok-ch-1",
    kind: "text",
    exType: "engineering",
    difficulty: "Advanced",
    concept: "token-cost",
    prompt: "You must choose between Model A (cheap per token, but its tokenizer produces many tokens for Hinglish) and Model B (2× the per-token price, but a tokenizer that is efficient on Hindi/Hinglish). Explain how you would decide, and what data you'd collect.",
    rubric: [
      { idea: "Measure token counts per call with each model's own tokenizer", keywords: ["each tokenizer", "both tokenizers", "measure", "count", "own tokenizer"] },
      { idea: "Use a representative/stratified sample (languages, quality)", keywords: ["representative", "stratified", "sample", "slice", "hinglish and english", "mix"] },
      { idea: "Compare effective cost per call = tokens × price (input and output)", keywords: ["cost per call", "tokens ×", "tokens x", "effective cost", "total cost", "per call"] },
      { idea: "Also compare accuracy/quality on the task, not only cost", keywords: ["accuracy", "quality", "f1", "evaluate", "performance"] },
      { idea: "Consider context window / latency", keywords: ["context", "latency", "ttft"] },
    ],
    minIdeas: 3,
    hint: "Price per token is only half the equation. What is the other half?",
    modelAnswer:
      "Draw a stratified sample of real calls (by language mix and transcript quality). Tokenize each with both models' tokenizers and compute effective cost per call = input_tokens × price_in + expected output_tokens × price_out, reporting mean and p95. Model B can be cheaper per call despite a higher per-token price if its tokenizer compresses Hinglish enough. Then evaluate both on a labelled gold set — cost only matters among models that meet the quality bar. Also check context headroom and latency at p95 call length.",
    explanation: "The decision variable is cost per decision at acceptable quality, not price per token.",
  },
  code: {
    title: "Count tokens and cost in Python",
    note: "This uses a simple whitespace/regex split as a stand-in for a real tokenizer (tiktoken isn't available in the browser Python runtime). The pattern — measure a sample, then budget on percentiles — is what matters.",
    code: `import re, statistics

calls = [
    "hello sir kaise help karu sir mujhe ek personal lon chahiye",
    "Good morning, thank you for calling. I want to apply for a car loan.",
    "haan haan bhej do main kal tak apply kar dunga",
    "sir aapka pre approved lone hai 3 lakh ka emi kitna aayega",
]

# crude proxy: words + punctuation pieces (replace with the real tokenizer in production)
def approx_tokens(s):
    return len(re.findall(r"\\w+|[^\\w\\s]", s)) * 1.3

counts = [approx_tokens(c) for c in calls]
print("per-call tokens:", [round(c) for c in counts])
print("mean:", round(statistics.mean(counts)), " max:", round(max(counts)))

RULEBOOK, PRICE_PER_M, N_CALLS = 5000, 3.0, 100_000
total = N_CALLS * (RULEBOOK + statistics.mean(counts))
print(f"monthly input tokens: {total:,.0f}")
print(f"monthly input cost:  \${total / 1e6 * PRICE_PER_M:,.2f}")
`,
  },
  related: ["text-normalization", "context-engineering", "caching-batching"],
  terms: ["token", "tokenization", "bpe", "sentencepiece", "subword", "vocabulary", "token-id", "context-window", "ttft"],
};
