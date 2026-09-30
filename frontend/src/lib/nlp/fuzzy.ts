/* String similarity algorithms used by the fuzzy-matching lab. All pure functions. */

export type EditOp = { op: "match" | "sub" | "ins" | "del"; a?: string; b?: string };

/** Levenshtein distance with the full DP matrix and one optimal alignment. */
export function levenshtein(a: string, b: string): { distance: number; matrix: number[][]; ops: EditOp[] } {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  // Backtrace one optimal edit script.
  const ops: EditOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      ops.push({ op: a[i - 1] === b[j - 1] ? "match" : "sub", a: a[i - 1], b: b[j - 1] });
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ op: "del", a: a[i - 1] });
      i--;
    } else {
      ops.push({ op: "ins", b: b[j - 1] });
      j--;
    }
  }
  ops.reverse();
  return { distance: d[m][n], matrix: d, ops };
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/** Normalized Levenshtein similarity in [0,1]: 1 − d / max(len). */
export function levenshteinSimilarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshteinDistance(a, b) / max;
}

/** Optimal string alignment (restricted Damerau–Levenshtein): counts adjacent transpositions as 1. */
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** Jaro similarity. */
export function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const l1 = s1.length;
  const l2 = s2.length;
  if (!l1 || !l2) return 0;
  const window = Math.max(0, Math.floor(Math.max(l1, l2) / 2) - 1);
  const m1 = new Array(l1).fill(false);
  const m2 = new Array(l2).fill(false);
  let matches = 0;
  for (let i = 0; i < l1; i++) {
    const lo = Math.max(0, i - window);
    const hi = Math.min(i + window + 1, l2);
    for (let j = lo; j < hi; j++) {
      if (m2[j] || s1[i] !== s2[j]) continue;
      m1[i] = true;
      m2[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < l1; i++) {
    if (!m1[i]) continue;
    while (!m2[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  const transpositions = t / 2;
  return (matches / l1 + matches / l2 + (matches - transpositions) / matches) / 3;
}

/** Jaro–Winkler: boosts Jaro by a common-prefix bonus (prefix ≤ 4, scaling p = 0.1). */
export function jaroWinkler(s1: string, s2: string, p = 0.1): { score: number; jaro: number; prefix: number } {
  const j = jaro(s1, s2);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return { score: j + prefix * p * (1 - j), jaro: j, prefix };
}

export function charNgrams(s: string, n = 2): string[] {
  const padded = ` ${s} `;
  const out: string[] = [];
  for (let i = 0; i <= padded.length - n; i++) out.push(padded.slice(i, i + n));
  return out;
}

export function jaccard<T>(a: Iterable<T>, b: Iterable<T>): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export const ngramSimilarity = (a: string, b: string, n = 2) => jaccard(charNgrams(a, n), charNgrams(b, n));

export const tokens = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export const tokenJaccard = (a: string, b: string) => jaccard(tokens(a), tokens(b));

/** Token-sort ratio: sort tokens then compare with normalized Levenshtein (order-insensitive). */
export function tokenSortRatio(a: string, b: string): number {
  const sa = tokens(a).sort().join(" ");
  const sb = tokens(b).sort().join(" ");
  return levenshteinSimilarity(sa, sb);
}

export type SimilarityMetric = "levenshtein" | "damerau" | "jaro-winkler" | "bigram" | "trigram" | "token-jaccard" | "token-sort";

export const METRIC_LABEL: Record<SimilarityMetric, string> = {
  levenshtein: "Levenshtein similarity",
  damerau: "Damerau-Levenshtein similarity",
  "jaro-winkler": "Jaro-Winkler",
  bigram: "Char bigram Jaccard",
  trigram: "Char trigram Jaccard",
  "token-jaccard": "Token Jaccard",
  "token-sort": "Token-sort ratio",
};

export function similarity(metric: SimilarityMetric, a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  switch (metric) {
    case "levenshtein":
      return levenshteinSimilarity(x, y);
    case "damerau": {
      const max = Math.max(x.length, y.length);
      return max ? 1 - damerauLevenshtein(x, y) / max : 1;
    }
    case "jaro-winkler":
      return jaroWinkler(x, y).score;
    case "bigram":
      return ngramSimilarity(x, y, 2);
    case "trigram":
      return ngramSimilarity(x, y, 3);
    case "token-jaccard":
      return tokenJaccard(x, y);
    case "token-sort":
      return tokenSortRatio(x, y);
  }
}
