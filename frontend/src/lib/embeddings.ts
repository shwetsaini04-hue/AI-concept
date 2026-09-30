/**
 * Embedding utilities for the IE labs.
 *  - Lexical baseline: character n-gram TF-IDF (always available, deterministic).
 *  - Neural: all-MiniLM-L6-v2 via transformers.js, downloaded from a CDN and run in the browser.
 *  - PCA (via the Gram matrix), k-means (k-means++ init), silhouette and class-based TF-IDF.
 */

export type Vec = number[];

const norm = (v: Vec) => Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
export const normalize = (v: Vec) => {
  const n = norm(v);
  return v.map((x) => x / n);
};
export function cosine(a: Vec, b: Vec) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return d / (norm(a) * norm(b));
}

/* ------------------------------ TF-IDF ------------------------------ */

function charGrams(s: string, lo = 3, hi = 4) {
  const t = ` ${s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()} `;
  const out: string[] = [];
  for (let n = lo; n <= hi; n++) for (let i = 0; i <= t.length - n; i++) out.push(t.slice(i, i + n));
  return out;
}

export function tfidfEmbed(texts: string[]): Vec[] {
  const docs = texts.map((t) => charGrams(t));
  const df = new Map<string, number>();
  docs.forEach((d) => new Set(d).forEach((g) => df.set(g, (df.get(g) ?? 0) + 1)));
  const vocab = [...df.keys()];
  const index = new Map(vocab.map((g, i) => [g, i]));
  const N = texts.length;
  return docs.map((d) => {
    const v = new Array(vocab.length).fill(0);
    const tf = new Map<string, number>();
    d.forEach((g) => tf.set(g, (tf.get(g) ?? 0) + 1));
    tf.forEach((c, g) => {
      v[index.get(g)!] = (c / d.length) * (Math.log((1 + N) / (1 + df.get(g)!)) + 1);
    });
    return normalize(v);
  });
}

/* ------------------------------ Neural ------------------------------ */

const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.0";
export const NEURAL_MODEL = "Xenova/all-MiniLM-L6-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractorPromise: Promise<any> | null = null;
const cache = new Map<string, Vec>();

export function loadNeural(onProgress?: (msg: string) => void) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      onProgress?.("Loading transformers.js…");
      const url: string = TRANSFORMERS_URL;
      const mod = await import(/* webpackIgnore: true */ url);
      onProgress?.("Downloading all-MiniLM-L6-v2 (~23 MB, cached after first time)…");
      const extractor = await mod.pipeline("feature-extraction", NEURAL_MODEL, {
        dtype: "q8",
        progress_callback: (p: { status: string; progress?: number; file?: string }) => {
          if (p.status === "progress" && p.progress !== undefined) onProgress?.(`Downloading ${p.file ?? "model"}: ${Math.round(p.progress)}%`);
        },
      });
      onProgress?.("");
      return extractor;
    })().catch((e) => {
      extractorPromise = null;
      throw e;
    });
  }
  return extractorPromise;
}

export const neuralLoaded = () => extractorPromise !== null;

export async function neuralEmbed(texts: string[]): Promise<Vec[]> {
  const missing = texts.filter((t) => !cache.has(t));
  if (missing.length) {
    const ex = await loadNeural();
    const out = await ex(missing, { pooling: "mean", normalize: true });
    const list = out.tolist() as number[][];
    missing.forEach((t, i) => cache.set(t, list[i]));
  }
  return texts.map((t) => cache.get(t)!);
}

/* ------------------------------ PCA ------------------------------ */

/** 2-D PCA via eigen-decomposition of the n×n Gram matrix (cheap when dims ≫ n). */
export function pca2(vectors: Vec[]): [number, number][] {
  const n = vectors.length;
  if (n === 0) return [];
  if (n === 1) return [[0, 0]];
  const d = vectors[0].length;
  const mean = new Array(d).fill(0);
  vectors.forEach((v) => v.forEach((x, j) => (mean[j] += x / n)));
  const X = vectors.map((v) => v.map((x, j) => x - mean[j]));
  const G = X.map((a) => X.map((b) => a.reduce((s, x, j) => s + x * b[j], 0)));
  const eig = (M: number[][], seed: number) => {
    let v = M.map((_, i) => Math.sin(i * 12.9898 + seed) + 0.5);
    let lambda = 0;
    for (let it = 0; it < 200; it++) {
      const w = M.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
      lambda = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1e-12;
      v = w.map((x) => x / lambda);
    }
    return { v, lambda };
  };
  const e1 = eig(G, 1);
  const G2 = G.map((row, i) => row.map((x, j) => x - e1.lambda * e1.v[i] * e1.v[j]));
  const e2 = eig(G2, 2);
  return X.map((_, i) => [e1.v[i] * Math.sqrt(e1.lambda), e2.v[i] * Math.sqrt(Math.max(0, e2.lambda))]);
}

/* ------------------------------ k-means ------------------------------ */

export function kmeans(vectors: Vec[], k: number, rand: () => number, iters = 50) {
  const n = vectors.length;
  const dist = (a: Vec, b: Vec) => 1 - cosine(a, b);
  // k-means++ init
  const centroids: Vec[] = [vectors[Math.floor(rand() * n)].slice()];
  while (centroids.length < k) {
    const d2 = vectors.map((v) => Math.min(...centroids.map((c) => dist(v, c))) ** 2);
    const s = d2.reduce((a, b) => a + b, 0) || 1;
    let r = rand() * s;
    let idx = 0;
    for (; idx < n; idx++) {
      r -= d2[idx];
      if (r <= 0) break;
    }
    centroids.push(vectors[Math.min(idx, n - 1)].slice());
  }
  let labels = new Array(n).fill(0);
  for (let it = 0; it < iters; it++) {
    const next = vectors.map((v) => {
      let best = 0;
      let bd = Infinity;
      centroids.forEach((c, j) => {
        const dd = dist(v, c);
        if (dd < bd) {
          bd = dd;
          best = j;
        }
      });
      return best;
    });
    const changed = next.some((l, i) => l !== labels[i]);
    labels = next;
    for (let j = 0; j < k; j++) {
      const members = vectors.filter((_, i) => labels[i] === j);
      if (!members.length) continue;
      const c = new Array(members[0].length).fill(0);
      members.forEach((m) => m.forEach((x, t) => (c[t] += x / members.length)));
      centroids[j] = c;
    }
    if (!changed && it > 0) break;
  }
  return { labels, centroids };
}

export function silhouette(vectors: Vec[], labels: number[]) {
  const n = vectors.length;
  const dist = (a: Vec, b: Vec) => 1 - cosine(a, b);
  const ks = [...new Set(labels)];
  if (ks.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const own = vectors.filter((_, j) => j !== i && labels[j] === labels[i]);
    if (!own.length) continue;
    const a = own.reduce((s, v) => s + dist(vectors[i], v), 0) / own.length;
    let b = Infinity;
    for (const k of ks) {
      if (k === labels[i]) continue;
      const other = vectors.filter((_, j) => labels[j] === k);
      if (!other.length) continue;
      b = Math.min(b, other.reduce((s, v) => s + dist(vectors[i], v), 0) / other.length);
    }
    total += (b - a) / Math.max(a, b);
  }
  return total / n;
}

/* ---------------------- class-based TF-IDF (BERTopic) ---------------------- */

const STOP = new Set(
  "a an the is are was to of in on for and or but i me my you it this that with be have has not no do so at as by from we they he she hai hain ka ki ke ko se mein main ek toh to bhi na ji sir ho hoon hu tha thi kya kar karo raha rahe abhi par aur yeh woh".split(" "),
);

export function cTfidf(texts: string[], labels: number[], topN = 4) {
  const clusters = [...new Set(labels)].sort((a, b) => a - b);
  const words = (t: string) => t.toLowerCase().replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const tf: Record<number, Map<string, number>> = {};
  const total = new Map<string, number>();
  let avgWords = 0;
  for (const c of clusters) {
    const m = new Map<string, number>();
    texts.forEach((t, i) => {
      if (labels[i] !== c) return;
      words(t).forEach((w) => m.set(w, (m.get(w) ?? 0) + 1));
    });
    tf[c] = m;
    m.forEach((v, w) => total.set(w, (total.get(w) ?? 0) + v));
    avgWords += [...m.values()].reduce((a, b) => a + b, 0) / clusters.length;
  }
  const out: Record<number, string[]> = {};
  for (const c of clusters) {
    const scored = [...tf[c].entries()].map(([w, v]) => [w, v * Math.log(1 + avgWords / (total.get(w) ?? 1))] as const);
    out[c] = scored.sort((a, b) => b[1] - a[1]).slice(0, topN).map((x) => x[0]);
  }
  return out;
}
