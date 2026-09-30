/**
 * Regression check for the prompt simulator + evaluator used by the Prompt lab and capstone.
 * Run: npx tsx scripts/check-sim.ts
 */
import { BAD, IMPROVED, TEST_SET, assemble, evaluate, simulate } from "../src/lib/llm/promptSim";
import { initialCapstone, scoreCapstone } from "../src/lib/capstone";

function run(name: string, cfg: typeof BAD) {
  const results = TEST_SET.map((c) => evaluate(c, simulate(assemble(cfg, c))));
  const acc = results.filter((r) => r.labelOk).length / results.length;
  const fmt = results.filter((r) => r.formatOk).length / results.length;
  const ev = results.filter((r) => r.evidenceOk).length / results.length;
  console.log(`${name.padEnd(9)} accuracy=${acc.toFixed(2)} format=${fmt.toFixed(2)} evidence=${ev.toFixed(2)}`);
  return { acc, fmt, ev };
}

const bad = run("BAD", BAD);
const good = run("IMPROVED", IMPROVED);
const fails: string[] = [];
if (!(bad.acc < 0.4)) fails.push("BAD prompt should score < 40%");
if (!(bad.fmt === 0)) fails.push("BAD prompt should never produce valid JSON");
if (!(good.acc === 1)) fails.push("IMPROVED prompt should classify all 6 correctly in the simulator");
if (!(good.fmt === 1)) fails.push("IMPROVED prompt should always produce valid JSON");
if (!(good.ev < 1 && good.ev >= 0.8)) fails.push("IMPROVED prompt should fail evidence only on the diarization case");

const empty = scoreCapstone(initialCapstone(BAD));
console.log(`capstone score for untouched state: ${empty.total}/100 (${empty.criteria.map((c) => `${c.name} ${c.earned}/${c.max}`).join(", ")})`);
if (empty.criteria.reduce((a, c) => a + c.max, 0) !== 100) fails.push("capstone rubric must total 100 points");
for (const c of empty.criteria) {
  const sum = c.checks.reduce((a, k) => a + k.pts, 0);
  if (Math.abs(sum - c.max) > 1e-9) fails.push(`capstone criterion ${c.name}: checks sum to ${sum}, max is ${c.max}`);
}

if (fails.length) {
  console.error("FAILED:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log("Simulator and rubric checks passed.");
