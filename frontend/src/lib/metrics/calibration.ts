/* Calibration: reliability bins, ECE, Brier score and temperature scaling. */

export interface Prediction {
  confidence: number; // model's probability for its predicted label
  correct: boolean;
}

export interface Bin {
  lo: number;
  hi: number;
  count: number;
  avgConfidence: number;
  accuracy: number;
}

export function reliabilityBins(preds: Prediction[], nBins = 10): Bin[] {
  const bins: Bin[] = Array.from({ length: nBins }, (_, i) => ({ lo: i / nBins, hi: (i + 1) / nBins, count: 0, avgConfidence: 0, accuracy: 0 }));
  for (const p of preds) {
    const i = Math.min(nBins - 1, Math.floor(p.confidence * nBins));
    const b = bins[i];
    b.count++;
    b.avgConfidence += p.confidence;
    b.accuracy += p.correct ? 1 : 0;
  }
  for (const b of bins) {
    if (b.count) {
      b.avgConfidence /= b.count;
      b.accuracy /= b.count;
    }
  }
  return bins;
}

export function ece(preds: Prediction[], nBins = 10) {
  const bins = reliabilityBins(preds, nBins);
  const n = preds.length || 1;
  return bins.reduce((acc, b) => acc + (b.count / n) * Math.abs(b.accuracy - b.avgConfidence), 0);
}

export function brier(preds: Prediction[]) {
  if (!preds.length) return 0;
  return preds.reduce((acc, p) => acc + Math.pow(p.confidence - (p.correct ? 1 : 0), 2), 0) / preds.length;
}

const clampP = (p: number) => Math.min(1 - 1e-6, Math.max(1e-6, p));
export const logit = (p: number) => Math.log(clampP(p) / (1 - clampP(p)));
export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * Temperature scaling for a binary "is the prediction correct" confidence.
 * p' = σ(logit(p) / T). T > 1 softens (fixes overconfidence), T < 1 sharpens.
 */
export const scaleConfidence = (p: number, T: number) => sigmoid(logit(p) / T);

export function nll(preds: Prediction[]) {
  return -preds.reduce((acc, p) => acc + Math.log(p.correct ? clampP(p.confidence) : 1 - clampP(p.confidence)), 0) / Math.max(1, preds.length);
}

/** Fit T by grid search minimizing negative log-likelihood (what you'd do on a validation set). */
export function fitTemperature(preds: Prediction[]) {
  let best = { T: 1, loss: Infinity };
  for (let T = 0.3; T <= 5; T += 0.02) {
    const loss = nll(preds.map((p) => ({ ...p, confidence: scaleConfidence(p.confidence, T) })));
    if (loss < best.loss) best = { T, loss };
  }
  return best;
}
