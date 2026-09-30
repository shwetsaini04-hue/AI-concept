/**
 * Interactive decision frameworks (requirement #53). Each tree teaches the
 * reasoning at every branch, not just a final verdict.
 */
export interface DecisionLeaf {
  verdict: string;
  tone: "go" | "caution" | "stop";
  reasoning: string;
  caveats: string[];
  lessons: string[];
}

export interface DecisionOption {
  label: string;
  next?: string;
  leaf?: DecisionLeaf;
}

export interface DecisionNode {
  id: string;
  question: string;
  why: string;
  options: DecisionOption[];
}

export interface DecisionTree {
  id: string;
  title: string;
  description: string;
  start: string;
  nodes: Record<string, DecisionNode>;
}

const tree = (id: string, title: string, description: string, nodes: DecisionNode[]): DecisionTree => ({
  id,
  title,
  description,
  start: nodes[0].id,
  nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
});

export const DECISION_TREES: DecisionTree[] = [
  tree("use-llm", "Should I use an LLM?", "Decide between deterministic code, classical ML, a fine-tuned small model, or an LLM.", [
    {
      id: "q1",
      question: "Can the logic be written as deterministic rules with high accuracy (lookup, regex, arithmetic)?",
      why: "Deterministic code is cheaper, faster, testable and never hallucinates. If a rule gets you 99% on a labelled sample, an LLM adds cost and variance.",
      options: [
        {
          label: "Yes — e.g. convert '5 lakh' to 500000, compute EMI",
          leaf: {
            verdict: "Write deterministic code",
            tone: "go",
            reasoning: "The mapping is specified exactly. Code is auditable and free per call. Cover variants with unit tests built from real transcripts.",
            caveats: ["Keep a log of inputs your rules fail on — that is how you discover when a model is needed."],
            lessons: ["text-normalization", "fuzzy-matching"],
          },
        },
        { label: "No — it depends on meaning, paraphrase or context", next: "q2" },
      ],
    },
    {
      id: "q2",
      question: "Does the task require understanding free-form, noisy language (negation, sarcasm, Hinglish, hedging)?",
      why: "Keyword and bag-of-words models break on 'nahi chahiye', 'maybe next month', and sarcasm. That's where LLMs earn their cost.",
      options: [
        {
          label: "No — surface patterns are enough",
          leaf: {
            verdict: "Classical ML / rules + fuzzy matching",
            tone: "go",
            reasoning: "TF-IDF + logistic regression or keyword rules with fuzzy matching are cheap, fast and strong baselines. Always build one — it tells you whether an LLM is actually needed.",
            caveats: ["Re-check on noisy slices; surface models degrade sharply with ASR noise."],
            lessons: ["text-classification", "fuzzy-matching"],
          },
        },
        { label: "Yes", next: "q3" },
      ],
    },
    {
      id: "q3",
      question: "Do you have thousands of consistent labels and very high volume with stable label definitions?",
      why: "At scale, a small fine-tuned classifier can match an LLM on a narrow task at a fraction of the cost and latency.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Fine-tune/distil a small model; route hard cases to an LLM",
            tone: "go",
            reasoning: "Use the LLM to label or adjudicate, train a small model on the labels, and send low-confidence cases to the LLM or humans.",
            caveats: ["Label drift: re-validate when products, scripts or call mixes change.", "Calibrate the small model before using its confidence for routing."],
            lessons: ["pipeline-design", "calibration"],
          },
        },
        { label: "No / not yet", next: "q4" },
      ],
    },
    {
      id: "q4",
      question: "Can you afford the per-call latency and cost at your volume?",
      why: "100k calls/day × a 6k-token prompt is 600M input tokens/day. Caching and batching change the math — calculate it.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Use an LLM with structured output, evidence and evaluation",
            tone: "go",
            reasoning: "Constrain outputs with a schema, require evidence spans, keep temperature low, measure on a gold set with per-class metrics.",
            caveats: ["Version prompts and pin model versions.", "Track cost per decision, not just per call."],
            lessons: ["prompt-engineering", "structured-output", "grounding"],
          },
        },
        {
          label: "No",
          leaf: {
            verdict: "Use the LLM selectively",
            tone: "caution",
            reasoning: "Route only ambiguous cases to the LLM, use a smaller model for easy cases, batch offline work and cache the static prompt prefix.",
            caveats: ["Routing adds a component that needs its own evaluation."],
            lessons: ["caching-batching", "model-selection", "pipeline-design"],
          },
        },
      ],
    },
  ]),

  tree("use-embeddings", "Should I use embeddings?", "Decide between lexical matching, embeddings, or neither.", [
    {
      id: "q1",
      question: "Is the task about similarity, grouping, deduplication or search over meaning?",
      why: "Embeddings measure closeness of meaning. They don't extract fields or make policy decisions by themselves.",
      options: [
        { label: "Yes", next: "q2" },
        {
          label: "No — I need field values or a decision",
          leaf: {
            verdict: "Embeddings are not the main tool",
            tone: "stop",
            reasoning: "Use extraction or classification. Embeddings can still help as features or for retrieving few-shot examples.",
            caveats: [],
            lessons: ["ner", "text-classification"],
          },
        },
      ],
    },
    {
      id: "q2",
      question: "Would lexical matching (keywords, BM25, fuzzy) already work — small vocabulary, IDs, names?",
      why: "Lexical methods are cheaper, exact and explainable. Embeddings shine on paraphrase ('borrow money' ≈ 'personal loan').",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Start lexical; add embeddings only if recall suffers",
            tone: "go",
            reasoning: "Measure recall on paraphrased queries. If it's poor, switch to hybrid (lexical + dense) retrieval.",
            caveats: ["Embeddings can confuse opposites that share topic ('want a loan' vs 'don't want a loan')."],
            lessons: ["fuzzy-matching", "embeddings"],
          },
        },
        { label: "No — lots of paraphrase and variation", next: "q3" },
      ],
    },
    {
      id: "q3",
      question: "Is the text multilingual or code-mixed (Hinglish, Romanized Hindi)?",
      why: "English-only embedding models place Romanized Hindi poorly. Model choice matters more than the similarity function.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Use a multilingual embedding model and validate on code-mixed pairs",
            tone: "caution",
            reasoning: "Build a small labelled set of similar/dissimilar Hinglish pairs and check that similarity separates them before trusting clusters or search.",
            caveats: ["Cosine values are not comparable across models; re-tune thresholds when you switch."],
            lessons: ["embeddings", "clustering"],
          },
        },
        {
          label: "No",
          leaf: {
            verdict: "Use embeddings, evaluated with labelled pairs",
            tone: "go",
            reasoning: "Measure retrieval recall@k or pair classification AUC on your domain. Consider hybrid search for exact terms like product codes.",
            caveats: [],
            lessons: ["embeddings"],
          },
        },
      ],
    },
  ]),

  tree("use-rag", "Should I use RAG?", "Most transcript-analysis tasks don't need retrieval. Check before building it.", [
    {
      id: "q1",
      question: "Does answering require knowledge that is NOT in the transcript or prompt?",
      why: "Intent, entities and evidence are all inside the transcript. Retrieval adds latency, cost and a new failure mode (missed retrieval).",
      options: [
        {
          label: "No — everything needed is in the call",
          leaf: {
            verdict: "No RAG",
            tone: "stop",
            reasoning: "The input already contains the evidence. Invest in context engineering and evaluation instead.",
            caveats: ["Very long calls may need chunking or segment selection — that's not the same as knowledge retrieval."],
            lessons: ["context-engineering", "grounding"],
          },
        },
        { label: "Yes — e.g. current rate sheet, product policy", next: "q2" },
      ],
    },
    {
      id: "q2",
      question: "Is that knowledge small and stable enough to put directly in the prompt?",
      why: "A 2,000-token policy that changes monthly fits in a cached system prompt. No retriever to build or evaluate.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Put it in the prompt (as a cached prefix)",
            tone: "go",
            reasoning: "Static knowledge at the start of the prompt is cheap with prompt caching and is always 'retrieved'.",
            caveats: ["Version the knowledge with the prompt so evaluations remain reproducible."],
            lessons: ["caching-batching", "context-engineering"],
          },
        },
        { label: "No — large or frequently changing", next: "q3" },
      ],
    },
    {
      id: "q3",
      question: "Is the knowledge structured with exact keys (customer records, rate tables)?",
      why: "Vector similarity is the wrong tool for exact lookups. 'Rate for PL, salaried, 5 lakh, 36 months' is a database query.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Deterministic lookup / SQL, not vector RAG",
            tone: "go",
            reasoning: "Extract the keys with the LLM or NER, then query the source of truth. Exact, auditable, cheap.",
            caveats: [],
            lessons: ["ner", "pipeline-design"],
          },
        },
        {
          label: "No — unstructured documents",
          leaf: {
            verdict: "RAG is appropriate",
            tone: "caution",
            reasoning: "Large, changing, unstructured knowledge is RAG's home turf. Evaluate retrieval (recall@k) separately from generation.",
            caveats: ["Missed retrieval looks like hallucination downstream — measure both stages."],
            lessons: ["rag-agents", "per-stage-evaluation"],
          },
        },
      ],
    },
  ]),

  tree("use-agent", "Should I use an agent?", "Agents are for open-ended, tool-dependent control flow. Transcript analysis rarely needs one.", [
    {
      id: "q1",
      question: "Is the sequence of steps known in advance?",
      why: "If you can draw the flowchart, you can build it as a pipeline — testable, predictable and cheaper.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Fixed pipeline / workflow",
            tone: "stop",
            reasoning: "Normalize → extract → classify → verify is a known sequence. An agent adds nondeterminism with no benefit.",
            caveats: [],
            lessons: ["pipeline-design"],
          },
        },
        { label: "No — next step depends on intermediate results", next: "q2" },
      ],
    },
    {
      id: "q2",
      question: "Must the system call tools where the next action depends on tool output in ways you can't enumerate?",
      why: "Most 'dynamic' needs are covered by a router or a single tool call.",
      options: [
        {
          label: "No — a few known branches",
          leaf: {
            verdict: "Router or a single LLM call with function calling",
            tone: "go",
            reasoning: "Enumerate the branches; let a classifier/LLM choose one. Each branch stays testable.",
            caveats: [],
            lessons: ["pipeline-design", "rag-agents"],
          },
        },
        { label: "Yes", next: "q3" },
      ],
    },
    {
      id: "q3",
      question: "Can you bound cost, time and permissions, and audit every action?",
      why: "Agents can loop, take wrong actions and burn tokens. Without guardrails and trajectory evaluation, they're unshippable.",
      options: [
        {
          label: "No",
          leaf: {
            verdict: "Not yet — use human-in-the-loop",
            tone: "stop",
            reasoning: "Have the model propose actions and a human approve them until you can evaluate trajectories.",
            caveats: [],
            lessons: ["rag-agents"],
          },
        },
        {
          label: "Yes",
          leaf: {
            verdict: "An agent may be justified",
            tone: "caution",
            reasoning: "Start with narrow tools, step limits, read-only permissions and logged trajectories evaluated against expected outcomes.",
            caveats: ["Evaluate success rate, cost per task and harmful-action rate."],
            lessons: ["rag-agents", "llm-judge"],
          },
        },
      ],
    },
  ]),

  tree("deterministic", "Should this be deterministic code?", "Decide between code, a model, or a hybrid.", [
    {
      id: "q1",
      question: "Is the transformation specified exactly (e.g. '50 L' → 5,000,000; EMI formula; date parsing)?",
      why: "If a spec exists, code implements it exactly. Models approximate it.",
      options: [
        { label: "Yes", next: "q2" },
        {
          label: "No — it needs judgement",
          leaf: {
            verdict: "Use a model (learned or LLM)",
            tone: "caution",
            reasoning: "Judgement tasks (intent, sarcasm, hedging) need a model plus evaluation.",
            caveats: [],
            lessons: ["text-classification", "prompt-engineering"],
          },
        },
      ],
    },
    {
      id: "q2",
      question: "Are the input variants enumerable, or coverable by fuzzy/phonetic matching?",
      why: "'lakh/lac/lakhs/L' is enumerable. Every way a customer can express doubt is not.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Deterministic code + tests",
            tone: "go",
            reasoning: "Write the rules, build a test suite from real transcripts, and log unmatched inputs.",
            caveats: [],
            lessons: ["text-normalization", "fuzzy-matching", "phonetic-matching"],
          },
        },
        {
          label: "No — long tail",
          leaf: {
            verdict: "Hybrid: code for common patterns, model for the tail",
            tone: "go",
            reasoning: "Rules handle 90% cheaply and exactly; route the rest to a model. Measure each path separately.",
            caveats: [],
            lessons: ["pipeline-design"],
          },
        },
      ],
    },
  ]),

  tree("classify-or-extract", "Classification or extraction?", "Choose the right task framing for the output you need.", [
    {
      id: "q1",
      question: "Is the output a choice from a fixed set of categories?",
      why: "Categorical outputs are classification. Values that appear in the text are extraction.",
      options: [
        { label: "Yes", next: "q2" },
        { label: "No", next: "q3" },
      ],
    },
    {
      id: "q2",
      question: "Does the downstream decision need the supporting text?",
      why: "Auditable decisions (compliance, disputes) need evidence spans, not just labels.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Classification + evidence extraction",
            tone: "go",
            reasoning: "Output {label, evidence, reasoning}. Evaluate label accuracy and evidence quality separately.",
            caveats: [],
            lessons: ["grounding", "text-classification"],
          },
        },
        {
          label: "No",
          leaf: {
            verdict: "Classification",
            tone: "go",
            reasoning: "Keep the output small and constrained (enum). Evaluate with per-class metrics.",
            caveats: [],
            lessons: ["text-classification", "classification-metrics"],
          },
        },
      ],
    },
    {
      id: "q3",
      question: "Is the output a value present in the text (amount, date, name, rate)?",
      why: "Extraction can be verified by checking the value exists in the transcript.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Extraction (NER / field extraction) + normalization",
            tone: "go",
            reasoning: "Extract the span, then normalize deterministically ('five lac' → 500000). Evaluate at span and field level.",
            caveats: [],
            lessons: ["ner", "structured-output"],
          },
        },
        {
          label: "No — free-form summary",
          leaf: {
            verdict: "Generation — reconsider the framing",
            tone: "caution",
            reasoning: "Free text is the hardest to evaluate. Can you turn it into classification (reason category) or extraction (quoted reason)?",
            caveats: [],
            lessons: ["open-closed-set", "llm-judge"],
          },
        },
      ],
    },
  ]),

  tree("multilabel-or-hierarchical", "Multi-label or hierarchical?", "Pick the label structure that matches reality.", [
    {
      id: "q1",
      question: "Can one call legitimately have more than one label at the same level?",
      why: "A call can be 'existing customer' AND 'interested in top-up' AND 'cross-sell interest'.",
      options: [
        { label: "Yes", next: "q2" },
        { label: "No", next: "q3" },
      ],
    },
    {
      id: "q2",
      question: "Are those labels on different dimensions (product vs intent vs objection)?",
      why: "Mixing dimensions in one label list is a classic taxonomy mistake.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Separate fields per dimension",
            tone: "go",
            reasoning: "product: enum, intent: enum, objections: list. Each is simpler to define, annotate and evaluate.",
            caveats: [],
            lessons: ["taxonomy-design"],
          },
        },
        {
          label: "No — same dimension",
          leaf: {
            verdict: "Multi-label within that dimension",
            tone: "go",
            reasoning: "e.g. objections: [rate, documentation]. Evaluate per label + Hamming loss.",
            caveats: [],
            lessons: ["text-classification"],
          },
        },
      ],
    },
    {
      id: "q3",
      question: "Are labels naturally nested, and do you need to back off to a parent when unsure?",
      why: "'Loan → Personal loan' lets you say 'Loan' when the product type is unclear.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Hierarchical labels",
            tone: "go",
            reasoning: "Predict top-down or flat-with-consistency; evaluate at each level.",
            caveats: [],
            lessons: ["text-classification", "taxonomy-design"],
          },
        },
        {
          label: "No",
          leaf: {
            verdict: "Flat multi-class with an abstain label",
            tone: "go",
            reasoning: "Mutually exclusive classes + 'insufficient evidence'.",
            caveats: [],
            lessons: ["text-classification"],
          },
        },
      ],
    },
  ]),

  tree("add-stage", "Should I add another pipeline stage?", "More stages mean more latency, cost and failure points.", [
    {
      id: "q1",
      question: "Does per-stage error analysis show a specific, recurring failure this stage would fix?",
      why: "Stages added on intuition often don't help and always cost.",
      options: [
        {
          label: "No / haven't measured",
          leaf: {
            verdict: "Don't add it yet — measure first",
            tone: "stop",
            reasoning: "Run per-stage evaluation and slice the errors. Add stages to fix measured failures.",
            caveats: [],
            lessons: ["per-stage-evaluation", "error-analysis"],
          },
        },
        { label: "Yes", next: "q2" },
      ],
    },
    {
      id: "q2",
      question: "Can the new stage be evaluated on its own gold labels?",
      why: "An unmeasurable stage can silently degrade the whole system.",
      options: [
        {
          label: "No",
          leaf: {
            verdict: "Define its metric and gold labels first",
            tone: "caution",
            reasoning: "Label ~100 examples for the stage's output before shipping it.",
            caveats: [],
            lessons: ["gold-set-design"],
          },
        },
        { label: "Yes", next: "q3" },
      ],
    },
    {
      id: "q3",
      question: "Is the added latency/cost within budget (considering parallelism)?",
      why: "Parallel stages add cost but not critical-path latency; sequential ones add both.",
      options: [
        {
          label: "No",
          leaf: {
            verdict: "Add it behind a router",
            tone: "caution",
            reasoning: "Run it only for cases that need it (e.g. low confidence, noisy transcripts).",
            caveats: [],
            lessons: ["pipeline-design"],
          },
        },
        {
          label: "Yes",
          leaf: {
            verdict: "Add it and A/B test against the current pipeline",
            tone: "go",
            reasoning: "Compare end-to-end and per-stage metrics with a paired significance test.",
            caveats: [],
            lessons: ["significance"],
          },
        },
      ],
    },
  ]),

  tree("use-judge", "Should I use an LLM judge?", "Judges are measurement instruments — validate before trusting.", [
    {
      id: "q1",
      question: "Can correctness be checked by exact comparison with a reference (label match, field match)?",
      why: "Exact metrics are free, deterministic and unbiased. Don't replace them with a judge.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "No judge — use exact metrics",
            tone: "stop",
            reasoning: "Precision/recall/F1 against gold labels are more reliable than any judge.",
            caveats: [],
            lessons: ["classification-metrics"],
          },
        },
        { label: "No — open-ended quality (reasoning, summary)", next: "q2" },
      ],
    },
    {
      id: "q2",
      question: "Can you get ~100+ human judgments to validate the judge against?",
      why: "Without human agreement data you don't know what the judge measures.",
      options: [
        {
          label: "No",
          leaf: {
            verdict: "Collect human labels first",
            tone: "stop",
            reasoning: "An unvalidated judge is an unknown instrument; its scores can't support decisions.",
            caveats: [],
            lessons: ["llm-judge", "inter-annotator-agreement"],
          },
        },
        { label: "Yes", next: "q3" },
      ],
    },
    {
      id: "q3",
      question: "Is the judge from the same model family as the generator?",
      why: "Self-preference and correlated blind spots inflate scores.",
      options: [
        {
          label: "Yes",
          leaf: {
            verdict: "Use with caution: different family or explicit bias checks",
            tone: "caution",
            reasoning: "Measure self-preference against humans; prefer a different family; swap positions in pairwise comparisons.",
            caveats: [],
            lessons: ["llm-judge"],
          },
        },
        {
          label: "No",
          leaf: {
            verdict: "Use an LLM judge — with a rubric and audits",
            tone: "go",
            reasoning: "Rubric-based, reference-guided, both orders, report judge–human κ, audit a sample periodically.",
            caveats: ["Re-validate when you change the judge model or prompt."],
            lessons: ["llm-judge", "inter-annotator-agreement"],
          },
        },
      ],
    },
  ]),
];
