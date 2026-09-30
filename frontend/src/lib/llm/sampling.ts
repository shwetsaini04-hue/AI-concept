/* Real sampling mathematics (temperature, top-p) applied to toy distributions. */

export interface Cand {
  tok: string;
  logit: number;
}

export function softmaxT(logits: number[], T: number): number[] {
  if (T <= 1e-6) {
    const max = Math.max(...logits);
    const idx = logits.indexOf(max);
    return logits.map((_, i) => (i === idx ? 1 : 0));
  }
  const m = Math.max(...logits);
  const ex = logits.map((z) => Math.exp((z - m) / T));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => e / s);
}

/** Returns the renormalized distribution after nucleus (top-p) filtering, plus which tokens were kept. */
export function topP(probs: number[], p: number): { probs: number[]; kept: boolean[] } {
  const order = probs.map((x, i) => [x, i] as const).sort((a, b) => b[0] - a[0]);
  const kept = probs.map(() => false);
  let cum = 0;
  for (const [x, i] of order) {
    kept[i] = true;
    cum += x;
    if (cum >= p - 1e-12) break;
  }
  const s = probs.reduce((a, x, i) => a + (kept[i] ? x : 0), 0);
  return { probs: probs.map((x, i) => (kept[i] ? x / s : 0)), kept };
}

export function entropyBits(probs: number[]) {
  return -probs.reduce((a, p) => a + (p > 0 ? p * Math.log2(p) : 0), 0);
}

export function sampleIndex(probs: number[], rand: () => number) {
  const r = rand();
  let cum = 0;
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i];
    if (r < cum) return i;
  }
  return probs.length - 1;
}

export function distribution(cands: Cand[], T: number, p: number) {
  const base = softmaxT(cands.map((c) => c.logit), 1);
  const scaled = softmaxT(cands.map((c) => c.logit), T);
  const { probs, kept } = topP(scaled, p);
  return { base, scaled, final: probs, kept };
}
