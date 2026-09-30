/* Classification metrics: binary from counts, multi-class from a confusion matrix. */

const safe = (n: number, d: number) => (d === 0 ? 0 : n / d);

export interface BinaryCounts {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface BinaryMetrics {
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  specificity: number;
  fpr: number;
  npv: number;
  prevalence: number;
  fbeta: (beta: number) => number;
}

export function binaryMetrics({ tp, fp, tn, fn }: BinaryCounts): BinaryMetrics {
  const precision = safe(tp, tp + fp);
  const recall = safe(tp, tp + fn);
  const n = tp + fp + tn + fn;
  return {
    precision,
    recall,
    f1: safe(2 * precision * recall, precision + recall),
    accuracy: safe(tp + tn, n),
    specificity: safe(tn, tn + fp),
    fpr: safe(fp, fp + tn),
    npv: safe(tn, tn + fn),
    prevalence: safe(tp + fn, n),
    fbeta: (beta: number) => {
      const b2 = beta * beta;
      return safe((1 + b2) * precision * recall, b2 * precision + recall);
    },
  };
}

export interface ClassReport {
  label: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
  tp: number;
  fp: number;
  fn: number;
}

export interface MultiReport {
  perClass: ClassReport[];
  accuracy: number;
  macro: { precision: number; recall: number; f1: number };
  micro: { precision: number; recall: number; f1: number };
  weighted: { precision: number; recall: number; f1: number };
  n: number;
}

/** matrix[gold][pred] */
export function multiClassReport(labels: string[], matrix: number[][]): MultiReport {
  const k = labels.length;
  const n = matrix.flat().reduce((a, b) => a + b, 0);
  const perClass: ClassReport[] = labels.map((label, i) => {
    const tp = matrix[i][i];
    const fn = matrix[i].reduce((a, b) => a + b, 0) - tp;
    let fp = 0;
    for (let g = 0; g < k; g++) if (g !== i) fp += matrix[g][i];
    const precision = safe(tp, tp + fp);
    const recall = safe(tp, tp + fn);
    return { label, precision, recall, f1: safe(2 * precision * recall, precision + recall), support: tp + fn, tp, fp, fn };
  });
  const avg = (key: "precision" | "recall" | "f1") => perClass.reduce((a, c) => a + c[key], 0) / Math.max(1, k);
  const wavg = (key: "precision" | "recall" | "f1") => safe(perClass.reduce((a, c) => a + c[key] * c.support, 0), n);
  const TP = perClass.reduce((a, c) => a + c.tp, 0);
  const FP = perClass.reduce((a, c) => a + c.fp, 0);
  const FN = perClass.reduce((a, c) => a + c.fn, 0);
  const microP = safe(TP, TP + FP);
  const microR = safe(TP, TP + FN);
  return {
    perClass,
    accuracy: safe(TP, n),
    macro: { precision: avg("precision"), recall: avg("recall"), f1: avg("f1") },
    micro: { precision: microP, recall: microR, f1: safe(2 * microP * microR, microP + microR) },
    weighted: { precision: wavg("precision"), recall: wavg("recall"), f1: wavg("f1") },
    n,
  };
}

/** Build a confusion matrix from paired label arrays. */
export function confusion(labels: string[], gold: string[], pred: string[]): number[][] {
  const idx = Object.fromEntries(labels.map((l, i) => [l, i]));
  const m = labels.map(() => labels.map(() => 0));
  gold.forEach((g, i) => {
    const gi = idx[g];
    const pi = idx[pred[i]];
    if (gi !== undefined && pi !== undefined) m[gi][pi]++;
  });
  return m;
}

/** Span-level NER scoring: strict (exact boundaries + type) and partial (overlap + type). */
export interface Span {
  start: number;
  end: number;
  type: string;
}

export function spanScores(gold: Span[], pred: Span[]) {
  const overlap = (a: Span, b: Span) => a.start < b.end && b.start < a.end;
  const strictTp = pred.filter((p) => gold.some((g) => g.start === p.start && g.end === p.end && g.type === p.type)).length;
  const partialTp = pred.filter((p) => gold.some((g) => overlap(g, p) && g.type === p.type)).length;
  const partialGoldHit = gold.filter((g) => pred.some((p) => overlap(g, p) && g.type === p.type)).length;
  const strict = {
    precision: safe(strictTp, pred.length),
    recall: safe(strictTp, gold.length),
    f1: 0,
  };
  strict.f1 = safe(2 * strict.precision * strict.recall, strict.precision + strict.recall);
  const partial = {
    precision: safe(partialTp, pred.length),
    recall: safe(partialGoldHit, gold.length),
    f1: 0,
  };
  partial.f1 = safe(2 * partial.precision * partial.recall, partial.precision + partial.recall);
  return { strict, partial };
}
