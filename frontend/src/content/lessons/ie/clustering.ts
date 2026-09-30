import type { Lesson } from "../../types";

export const clustering: Lesson = {
  slug: "clustering",
  module: "ie",
  order: 4,
  title: "Topic Modeling and Clustering",
  tagline: "Let the data propose categories — then decide, as a human, which ones deserve to exist.",
  difficulty: "Advanced",
  minutes: 35,
  stages: ["classification", "evaluation"],
  why: `Your taxonomy only contains categories someone imagined. **[[Clustering|clustering]]** and **[[topic modeling|topic-modeling]]** look at thousands of customer utterances and group the similar ones, revealing themes you didn't anticipate — "the app keeps crashing", "CIBIL score worries", "wants to wait until after Diwali".

Clusters are hypotheses, not facts. The number of clusters, the embedding model and the algorithm all change the answer. The engineering skill is using clusters to *discover* and then *governing* what enters the taxonomy.`,
  concepts: [
    {
      title: "Embed → reduce → cluster → describe",
      intuition: `1. Turn each utterance into a vector (embeddings).
2. Squash the vectors into fewer dimensions so clustering works better.
3. Group nearby points.
4. Describe each group with its most distinctive words — then a human names it.`,
      technical: `**[[BERTopic|bertopic]]**: sentence embeddings → **[[UMAP|umap]]** (non-linear reduction preserving local neighbourhoods) → **[[HDBSCAN|hdbscan]]** (density-based; finds the number of clusters and labels outliers as noise) → **[[class-based TF-IDF|c-tf-idf]]** (treat each cluster as one document; score terms by tf·log(1 + A/f)). The lab uses PCA + **[[k-means]]** for speed and transparency: k-means needs k, assumes roughly spherical clusters and assigns every point (no noise label).`,
      example: `26 objection snippets with k = 5: clusters around rate/EMI, eligibility, timing, documents, not-needed. c-TF-IDF keywords like "rate, emi, zyada" make them nameable.`,
    },
    {
      title: "Choosing k and judging clusters",
      intuition: `There's no single correct number of clusters. Scores like the **[[silhouette]]** help, but the real test is: can a person read each cluster, give it a clear name, and would the business act on it?`,
      technical: `Silhouette s = (b − a)/max(a, b) averaged over points (a: mean intra-cluster distance; b: mean distance to the nearest other cluster). Use it to compare k, alongside stability (do clusters persist across seeds/subsamples?), purity against a labelled sample, and human coherence ratings. Density methods (HDBSCAN) avoid choosing k but introduce min_cluster_size. Beware: clusters can form around surface features (language, filler words, ASR artifacts) rather than meaning.`,
      example: `With TF-IDF, Hinglish snippets may cluster by shared words like "hai" rather than by objection. Switch to the neural model and compare purity against the hidden themes in the lab.`,
    },
  ],
  questions: {
    what: "Unsupervised grouping of texts by similarity (clustering) and discovering latent themes with descriptive terms (topic modeling).",
    why: "Categories you haven't imagined can't be in your taxonomy; data can suggest them.",
    problem: "It surfaces new themes, sizes them, and gives candidate names — the input to taxonomy evolution.",
    how: "Embed, reduce dimensions, cluster (k-means/HDBSCAN), describe with c-TF-IDF keywords and examples, review with humans.",
    onRealData: "Short, noisy, code-mixed utterances cluster on surface features; a few themes dominate while many are long-tail.",
    whatCanGoWrong: "Arbitrary k, unstable clusters, clusters formed by language/ASR artifacts, over-trusting auto-generated names, treating clusters as ground truth.",
    howToEvaluate: "Silhouette and stability for structure; purity/NMI against a labelled sample; human coherence and actionability ratings.",
    whenToUse: "Exploring 'Other' reasons, launching new products, periodic taxonomy review.",
    whenNotToUse: "As a production classifier or KPI source without review; with tiny data.",
    downstream: "Clusters feed taxonomy changes, guideline updates and new gold-set categories.",
  },
  lab: {
    id: "clustering",
    title: "Clustering laboratory",
    intro: "Embed 26 objection snippets (TF-IDF or a real in-browser MiniLM model), project with PCA, cluster with k-means, read c-TF-IDF keywords, compare silhouette across k, name the clusters and reveal the hidden themes.",
    modes: ["computed", "real-local"],
  },
  realWorld: {
    text: `A quarterly review embedded 40,000 "Other" objection reasons with a multilingual encoder and ran BERTopic. Of 31 topics, 9 were artifacts (greetings, ASR garbage, language-specific fillers), 14 mapped to existing categories (label leakage into 'Other'), and 8 were new. Two of those — "loan app login failures" and "waiting for festival bonus" — were large and actionable and became taxonomy v4 categories after human review.`,
  },
  mistakes: [
    { mistake: "Treating clusters as ground truth", why: "Different settings produce different clusters.", fix: "Treat clusters as hypotheses; validate with humans and labels." },
    { mistake: "Choosing k by eye once", why: "Unstable, arbitrary.", fix: "Compare k with silhouette and stability; prefer interpretable, actionable clusters." },
    { mistake: "Clustering surface artifacts", why: "Fillers, language and ASR errors dominate lexical vectors.", fix: "Use good multilingual embeddings; filter fillers; inspect examples." },
    { mistake: "Auto-publishing generated topic names", why: "Names can be misleading.", fix: "Humans name clusters from keywords + examples." },
  ],
  decision: {
    question: "When should clustering drive a taxonomy change?",
    useWhen: ["A cluster is coherent (humans agree on a name), sizeable, stable across runs, and actionable"],
    avoidWhen: ["Clusters driven by artifacts", "Tiny or unstable clusters", "No owner to govern the change"],
    tradeoffs: [
      { a: "k-means", b: "HDBSCAN", note: "k-means is simple and fast but needs k and assigns everything; HDBSCAN finds k and noise but is sensitive to parameters." },
      { a: "Automation", b: "Human review", note: "Automation finds candidates; humans decide what's real and useful." },
    ],
  },
  exercises: [
    {
      id: "cl-ex-1",
      kind: "mcq",
      exType: "conceptual",
      difficulty: "Intermediate",
      concept: "topic-modeling",
      prompt: "What does c-TF-IDF do in BERTopic?",
      options: [
        { text: "Finds words that are distinctive for each cluster, to describe it", correct: true },
        { text: "Creates the embeddings", whyWrong: "That's the encoder." },
        { text: "Chooses the number of clusters", whyWrong: "HDBSCAN does that." },
        { text: "Reduces dimensions", whyWrong: "That's UMAP." },
      ],
      hint: "Class-based term weighting.",
      explanation: "Treat each cluster as one document; score terms against other clusters.",
    },
    {
      id: "cl-ex-2",
      kind: "numeric",
      exType: "applied",
      difficulty: "Intermediate",
      concept: "clustering",
      prompt: "For a point, mean distance to its own cluster a = 0.20; mean distance to the nearest other cluster b = 0.50. Silhouette s = ? (2 decimals)",
      answer: 0.6,
      tolerance: 0.01,
      hint: "(b − a)/max(a, b).",
      explanation: "(0.50 − 0.20)/0.50 = **0.60** — well placed.",
    },
    {
      id: "cl-ex-3",
      kind: "text",
      exType: "engineering",
      difficulty: "Advanced",
      concept: "clustering",
      prompt: "You clustered 10,000 'Other' reasons into 25 topics. Describe how you decide which topics become taxonomy categories.",
      rubric: [
        { idea: "Human review of keywords and examples; name coherence", keywords: ["human", "review", "examples", "name", "coheren"] },
        { idea: "Size / volume / growth", keywords: ["size", "volume", "growth", "large", "share"] },
        { idea: "Stability across runs/seeds/models", keywords: ["stable", "stability", "seeds", "re-run", "robust"] },
        { idea: "Actionability for the business", keywords: ["action", "business", "owner", "useful"] },
        { idea: "Filter artifacts / map to existing categories", keywords: ["artifact", "noise", "existing", "leak", "filler"] },
      ],
      minIdeas: 3,
      hint: "Coherent, big, stable, actionable, not an artifact.",
      modelAnswer:
        "For each topic, read keywords and 20 random examples; discard artifacts (fillers, ASR garbage) and topics that map to existing categories (label leakage). Keep candidates that humans can name consistently, that are large or growing, that persist across seeds/model variants, and that an owner can act on. Write definitions and examples, add them in a new taxonomy version, relabel a sample, and update prompts and gold sets.",
      explanation: "Discovery is automated; adoption is governed.",
    },
  ],
  quiz: [
    {
      id: "cl-q-1",
      kind: "mcq",
      difficulty: "Beginner",
      concept: "clustering",
      prompt: "k-means requires you to choose…",
      options: [
        { text: "The number of clusters k", correct: true },
        { text: "The labels", whyWrong: "It's unsupervised." },
        { text: "A threshold for noise", whyWrong: "k-means has no noise label." },
        { text: "A language model", whyWrong: "Not inherently." },
      ],
      hint: "It's in the name.",
      explanation: "k is a hyperparameter.",
    },
    {
      id: "cl-q-2",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "topic-modeling",
      prompt: "An advantage of HDBSCAN over k-means:",
      options: [
        { text: "It finds the number of clusters and marks outliers as noise", correct: true },
        { text: "It's always faster", whyWrong: "Not necessarily." },
        { text: "It needs no parameters", whyWrong: "It has min_cluster_size etc." },
        { text: "It produces topic names", whyWrong: "c-TF-IDF/humans do that." },
      ],
      hint: "Density-based.",
      explanation: "No k, explicit noise.",
    },
    {
      id: "cl-q-3",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "clustering",
      prompt: "Your clusters group Hinglish vs English snippets rather than objection types. Likely cause?",
      options: [
        { text: "The representation captures surface language features more than meaning", correct: true },
        { text: "k is too large", whyWrong: "Not the core issue." },
        { text: "Silhouette is negative", whyWrong: "A symptom at most." },
        { text: "The data has no objections", whyWrong: "It does." },
      ],
      hint: "What do lexical vectors see?",
      explanation: "Use meaning-level (multilingual) embeddings.",
    },
    {
      id: "cl-q-4",
      kind: "mcq",
      difficulty: "Intermediate",
      concept: "clustering",
      prompt: "A silhouette score near 0 suggests…",
      options: [
        { text: "Points lie between clusters; separation is weak", correct: true },
        { text: "Perfect clustering", whyWrong: "That's near 1." },
        { text: "Wrong assignments everywhere", whyWrong: "That's negative." },
        { text: "k = 1", whyWrong: "Silhouette is undefined for one cluster." },
      ],
      hint: "a ≈ b.",
      explanation: "Overlapping clusters.",
    },
    {
      id: "cl-q-5",
      kind: "mcq",
      difficulty: "Advanced",
      concept: "topic-modeling",
      prompt: "Why use UMAP before HDBSCAN in BERTopic?",
      options: [
        { text: "Density clustering works poorly in very high dimensions; UMAP keeps local structure in fewer dimensions", correct: true },
        { text: "To create embeddings", whyWrong: "The encoder does." },
        { text: "To name topics", whyWrong: "No." },
        { text: "To translate languages", whyWrong: "No." },
      ],
      hint: "Curse of dimensionality.",
      explanation: "Reduce dimensions while preserving neighbourhoods.",
    },
  ],
  challenge: {
    id: "cl-ch-1",
    kind: "mcq",
    exType: "engineering",
    difficulty: "Expert",
    concept: "topic-modeling",
    prompt: "A new topic 'loan app login failures' appears with 3% of 'Other' reasons this month (0.2% last month). What should happen?",
    options: [
      { text: "Alert the product owner now (fast-growing, actionable), review examples, and consider a taxonomy category if it persists", correct: true },
      { text: "Wait a year for more data", whyWrong: "Growth + actionability justify quick action." },
      { text: "Add it to the taxonomy immediately without review", whyWrong: "Review examples first; confirm it's not an artifact." },
      { text: "Ignore — 3% is small", whyWrong: "15× growth is a strong signal." },
    ],
    hint: "Growth, actionability, governance.",
    explanation: "Clusters are early-warning signals; governance decides permanence.",
  },
  code: {
    title: "Mini BERTopic-style pipeline (TF-IDF + KMeans + c-TF-IDF)",
    code: `import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

docs = ["EMI is too high", "rate kam karo", "interest rate bahut zyada hai", "can you reduce the rate",
        "call me next month", "abhi busy hu", "after diwali I will think", "too many documents",
        "salary slips nahi hai", "paperwork is complicated", "CIBIL score low hai", "I am a student, no job"]
X = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 4)).fit_transform(docs)
for k in [3, 4, 5]:
    labels = KMeans(n_clusters=k, n_init=10, random_state=0).fit_predict(X)
    print(f"k={k} silhouette={silhouette_score(X, labels, metric='cosine'):.3f}")

labels = KMeans(n_clusters=4, n_init=10, random_state=0).fit_predict(X)
cv = CountVectorizer().fit(docs)
per_class = np.vstack([cv.transform([" ".join(d for d, l in zip(docs, labels) if l == c)]).toarray()[0] for c in range(4)])
A = per_class.sum() / 4
ctfidf = (per_class / per_class.sum(1, keepdims=True)) * np.log(1 + A / per_class.sum(0))
terms = cv.get_feature_names_out()
for c in range(4):
    print(c, [terms[i] for i in ctfidf[c].argsort()[::-1][:3]])
`,
  },
  related: ["embeddings", "open-closed-set", "taxonomy-design"],
  terms: ["clustering", "k-means", "silhouette", "bertopic", "umap", "hdbscan", "c-tf-idf", "topic-modeling"],
};
