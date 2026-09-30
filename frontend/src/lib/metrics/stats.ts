/* Statistics helpers for significance testing and confidence intervals. */

/** erf via Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7). */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

export const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

/** Inverse standard normal CDF (Acklam's rational approximation, rel. error < 1.2e-9). */
export function normalInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let q: number;
  let r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= 1 - pl) {
    q = p - 0.5;
    r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/** Wilson score interval for a binomial proportion. */
export function wilson(successes: number, n: number, confidence = 0.95): [number, number] {
  if (n === 0) return [0, 1];
  const z = normalInv(1 - (1 - confidence) / 2);
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/** Two-proportion z-test (independent samples). */
export function twoProportionTest(x1: number, n1: number, x2: number, n2: number) {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  const z = se === 0 ? 0 : (p2 - p1) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  // Unpooled SE for the CI of the difference
  const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const zc = 1.959963984540054;
  return { p1, p2, diff: p2 - p1, z, pValue, ci: [p2 - p1 - zc * seDiff, p2 - p1 + zc * seDiff] as [number, number] };
}

function logFactorial(n: number): number {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}

/** McNemar's test on discordant pairs b (A right, B wrong) and c (A wrong, B right). */
export function mcnemar(b: number, c: number) {
  const n = b + c;
  if (n === 0) return { chi2: 0, pChi2: 1, pExact: 1 };
  const chi2 = Math.pow(Math.abs(b - c) - 1, 2) / n;
  const pChi2 = 2 * (1 - normalCdf(Math.sqrt(Math.max(0, chi2))));
  const k = Math.min(b, c);
  const lf = logFactorial(n);
  let tail = 0;
  for (let i = 0; i <= k; i++) tail += Math.exp(lf - logFactorial(i) - logFactorial(n - i) - n * Math.LN2);
  const pExact = Math.min(1, 2 * tail);
  return { chi2, pChi2, pExact };
}

/** Required n per group to detect p1 vs p2 with a two-sided unpaired test. */
export function sampleSizeTwoProportions(p1: number, p2: number, alpha = 0.05, power = 0.8) {
  const za = normalInv(1 - alpha / 2);
  const zb = normalInv(power);
  const pbar = (p1 + p2) / 2;
  const num = za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  const d = Math.abs(p1 - p2);
  return d === 0 ? Infinity : Math.ceil((num * num) / (d * d));
}

/** Percentile bootstrap CI of a statistic over indices. */
export function bootstrapCI(n: number, stat: (idx: number[]) => number, rand: () => number, B = 1000, confidence = 0.95): [number, number] {
  const vals: number[] = [];
  for (let b = 0; b < B; b++) {
    const idx = Array.from({ length: n }, () => Math.floor(rand() * n));
    vals.push(stat(idx));
  }
  vals.sort((x, y) => x - y);
  const lo = vals[Math.floor(((1 - confidence) / 2) * B)];
  const hi = vals[Math.min(B - 1, Math.floor((1 - (1 - confidence) / 2) * B))];
  return [lo, hi];
}

export function binomialSample(n: number, p: number, rand: () => number) {
  let k = 0;
  for (let i = 0; i < n; i++) if (rand() < p) k++;
  return k;
}
