/* Verifies the algorithms the labs rely on against published reference values.
   Run: npm test   (Node's built-in test runner with TypeScript type stripping) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { levenshtein, jaro, jaroWinkler, damerauLevenshtein } from "./nlp/fuzzy.ts";
import { soundex, metaphone } from "./nlp/phonetic.ts";
import { cohenKappa, fleissKappa, krippendorffAlphaNominal } from "./metrics/agreement.ts";
import { binaryMetrics, multiClassReport } from "./metrics/classification.ts";
import { wilson, mcnemar, normalInv, twoProportionTest } from "./metrics/stats.ts";
import { ece } from "./metrics/calibration.ts";

const close = (a: number, b: number, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test("levenshtein", () => {
  assert.equal(levenshtein("kitten", "sitting").distance, 3);
  assert.equal(levenshtein("persnal loan", "personal loan").distance, 1);
  assert.equal(damerauLevenshtein("lnoa", "loan"), 2);
  assert.equal(damerauLevenshtein("laon", "loan"), 1);
});

test("jaro / jaro-winkler (Winkler 1990 examples)", () => {
  close(jaro("MARTHA", "MARHTA"), 0.944);
  close(jaroWinkler("MARTHA", "MARHTA").score, 0.961);
  close(jaroWinkler("DWAYNE", "DUANE").score, 0.84);
  close(jaroWinkler("DIXON", "DICKSONX").score, 0.813);
});

test("soundex (US census rules)", () => {
  assert.equal(soundex("Robert"), "R163");
  assert.equal(soundex("Rupert"), "R163");
  assert.equal(soundex("Rubin"), "R150");
  assert.equal(soundex("Ashcraft"), "A261");
  assert.equal(soundex("Tymczak"), "T522");
  assert.equal(soundex("Pfister"), "P236");
  assert.equal(soundex("Honeyman"), "H555");
  assert.equal(soundex("Rahul"), soundex("Rahool"));
});

test("metaphone", () => {
  assert.equal(metaphone("Knight"), "NT");
  assert.equal(metaphone("Phone"), "FN");
  assert.equal(metaphone("Rahul"), "RHL");
  assert.equal(metaphone("Raahul"), "RHL");
});

test("cohen kappa (2x2 textbook example)", () => {
  const A: string[] = [];
  const B: string[] = [];
  const push = (a: string, b: string, n: number) => {
    for (let i = 0; i < n; i++) {
      A.push(a);
      B.push(b);
    }
  };
  push("yes", "yes", 20);
  push("yes", "no", 5);
  push("no", "yes", 10);
  push("no", "no", 15);
  const r = cohenKappa(A, B, ["yes", "no"]);
  close(r.observed, 0.7);
  close(r.expected, 0.5);
  close(r.kappa, 0.4);
});

test("fleiss kappa (Wikipedia example, κ≈0.210)", () => {
  const table = [
    [0, 0, 0, 0, 14],
    [0, 2, 6, 4, 2],
    [0, 0, 3, 5, 6],
    [0, 3, 9, 2, 0],
    [2, 2, 8, 1, 1],
    [7, 7, 0, 0, 0],
    [3, 2, 6, 3, 0],
    [2, 5, 3, 2, 2],
    [6, 5, 2, 1, 0],
    [0, 2, 2, 3, 7],
  ];
  const cats = ["1", "2", "3", "4", "5"];
  const ratings = table.map((row) => row.flatMap((count, j) => Array(count).fill(cats[j])));
  close(fleissKappa(ratings, cats).kappa, 0.21, 0.002);
});

test("krippendorff alpha nominal with missing data (Krippendorff's example, α≈0.743)", () => {
  const _ = null;
  const coders = [
    ["1", "2", "3", "3", "2", "1", "4", "1", "2", _, _, _],
    ["1", "2", "3", "3", "2", "2", "4", "1", "2", "5", _, "3"],
    [_, "3", "3", "3", "2", "3", "4", "2", "2", "5", "1", _],
    ["1", "2", "3", "3", "2", "4", "4", "1", "2", "5", "1", _],
  ];
  const units = coders[0].map((_, i) => coders.map((c) => c[i]));
  close(krippendorffAlphaNominal(units).alpha, 0.743, 0.002);
});

test("binary + multiclass metrics", () => {
  const m = binaryMetrics({ tp: 40, fp: 10, tn: 930, fn: 20 });
  close(m.precision, 0.8);
  close(m.recall, 0.6667);
  close(m.f1, 0.7273);
  close(m.accuracy, 0.97);
  const r = multiClassReport(["a", "b"], [
    [8, 2],
    [1, 9],
  ]);
  close(r.accuracy, 0.85);
  close(r.micro.f1, 0.85); // micro-F1 == accuracy for single-label multi-class
});

test("stats", () => {
  close(normalInv(0.975), 1.95996, 1e-4);
  const [lo, hi] = wilson(0, 10);
  close(lo, 0);
  close(hi, 0.2775, 1e-3);
  close(mcnemar(12, 25).chi2, 3.8919);
  close(mcnemar(12, 25).pChi2, 0.0485, 1e-3);
  const t = twoProportionTest(80, 100, 90, 100);
  close(t.pValue, 0.0477, 1e-3);
});

test("ece measures the confidence–accuracy gap", () => {
  // 7 of 10 correct at confidence 0.75 → |0.70 − 0.75| = 0.05
  const preds = Array.from({ length: 10 }, (_, i) => ({ confidence: 0.75, correct: i < 7 }));
  close(ece(preds), 0.05);
});
