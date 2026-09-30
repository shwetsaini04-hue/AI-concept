/* Inter-annotator agreement statistics. `null` means the annotator did not label the item. */

export type Label = string | null;

export interface CohenResult {
  n: number;
  observed: number;
  expected: number;
  kappa: number;
  marginalsA: Record<string, number>;
  marginalsB: Record<string, number>;
}

/** Cohen's κ for two annotators over the items both labelled. */
export function cohenKappa(a: Label[], b: Label[], categories: string[]): CohenResult {
  const pairs = a.map((x, i) => [x, b[i]] as const).filter(([x, y]) => x !== null && y !== null) as [string, string][];
  const n = pairs.length;
  const mA: Record<string, number> = Object.fromEntries(categories.map((c) => [c, 0]));
  const mB: Record<string, number> = Object.fromEntries(categories.map((c) => [c, 0]));
  let agree = 0;
  for (const [x, y] of pairs) {
    mA[x] = (mA[x] ?? 0) + 1;
    mB[y] = (mB[y] ?? 0) + 1;
    if (x === y) agree++;
  }
  const observed = n ? agree / n : 0;
  const expected = n ? categories.reduce((acc, c) => acc + (mA[c] / n) * (mB[c] / n), 0) : 0;
  const kappa = expected === 1 ? (observed === 1 ? 1 : 0) : (observed - expected) / (1 - expected);
  return { n, observed, expected, kappa, marginalsA: mA, marginalsB: mB };
}

export interface FleissResult {
  n: number;
  raters: number;
  pBar: number;
  peBar: number;
  kappa: number;
  categoryProportions: Record<string, number>;
}

/**
 * Fleiss' κ. `ratings[item][rater]`; items where any rater is missing are
 * excluded (Fleiss assumes a fixed number of raters per item).
 */
export function fleissKappa(ratings: Label[][], categories: string[]): FleissResult {
  const complete = ratings.filter((r) => r.every((x) => x !== null)) as string[][];
  const N = complete.length;
  const n = complete[0]?.length ?? 0;
  if (N === 0 || n < 2) return { n: N, raters: n, pBar: 0, peBar: 0, kappa: 0, categoryProportions: {} };
  const totals: Record<string, number> = Object.fromEntries(categories.map((c) => [c, 0]));
  let pSum = 0;
  for (const item of complete) {
    const counts: Record<string, number> = {};
    for (const x of item) counts[x] = (counts[x] ?? 0) + 1;
    let sq = 0;
    for (const [c, v] of Object.entries(counts)) {
      sq += v * v;
      totals[c] = (totals[c] ?? 0) + v;
    }
    pSum += (sq - n) / (n * (n - 1));
  }
  const pBar = pSum / N;
  const props: Record<string, number> = {};
  let peBar = 0;
  for (const c of Object.keys(totals)) {
    props[c] = totals[c] / (N * n);
    peBar += props[c] * props[c];
  }
  const kappa = peBar === 1 ? (pBar === 1 ? 1 : 0) : (pBar - peBar) / (1 - peBar);
  return { n: N, raters: n, pBar, peBar, kappa, categoryProportions: props };
}

export interface AlphaResult {
  alpha: number;
  observedDisagreement: number;
  expectedDisagreement: number;
  pairableValues: number;
}

/**
 * Krippendorff's α for nominal data, handling missing values.
 * ratings[item][rater]; units with fewer than 2 values are not pairable.
 */
export function krippendorffAlphaNominal(ratings: Label[][]): AlphaResult {
  const coincidence = new Map<string, Map<string, number>>();
  const add = (c: string, k: string, v: number) => {
    if (!coincidence.has(c)) coincidence.set(c, new Map());
    const row = coincidence.get(c)!;
    row.set(k, (row.get(k) ?? 0) + v);
  };
  for (const unit of ratings) {
    const vals = unit.filter((x): x is string => x !== null);
    const m = vals.length;
    if (m < 2) continue;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) if (i !== j) add(vals[i], vals[j], 1 / (m - 1));
  }
  const cats = [...coincidence.keys()];
  const nc: Record<string, number> = {};
  let n = 0;
  for (const c of cats) {
    nc[c] = [...coincidence.get(c)!.values()].reduce((a, b) => a + b, 0);
    n += nc[c];
  }
  if (n <= 1) return { alpha: 0, observedDisagreement: 0, expectedDisagreement: 0, pairableValues: n };
  let disagreeObs = 0;
  for (const c of cats) for (const [k, v] of coincidence.get(c)!) if (c !== k) disagreeObs += v;
  let disagreeExp = 0;
  for (const c of cats) for (const k of cats) if (c !== k) disagreeExp += nc[c] * nc[k];
  const Do = disagreeObs / n;
  const De = disagreeExp / (n * (n - 1));
  const alpha = De === 0 ? (Do === 0 ? 1 : 0) : 1 - Do / De;
  return { alpha, observedDisagreement: Do, expectedDisagreement: De, pairableValues: n };
}

/** Landis & Koch (1977) descriptive bands — a convention, not a law. */
export function kappaBand(k: number): string {
  if (k < 0) return "worse than chance";
  if (k < 0.2) return "slight";
  if (k < 0.4) return "fair";
  if (k < 0.6) return "moderate";
  if (k < 0.8) return "substantial";
  return "almost perfect";
}
