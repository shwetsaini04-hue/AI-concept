"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Legend } from "recharts";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, LabeledSlider, Tabs, TabsContent, TabsList, TabsTrigger, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { cohenKappa } from "@/lib/metrics/agreement";
import { cn, gaussian, pct, rng } from "@/lib/utils";

interface JudgeItem {
  context: string;
  answer: string;
  reference: "correct" | "incorrect";
  judgeScore: number;
  lesson: string;
}

const ITEMS: JudgeItem[] = [
  { context: "Customer: haan bhej do, main kal tak apply kar dunga", answer: "interested — customer commits: “main kal tak apply kar dunga”.", reference: "correct", judgeScore: 5, lesson: "Easy case: everyone agrees." },
  { context: "Customer: wah 18 percent, bahut badhiya offer hai... zaroor lunga / … arre mazaak kar raha tha, itna mehenga kaun lega", answer: "interested — customer said “zaroor lunga” (I'll definitely take it).", reference: "incorrect", judgeScore: 4, lesson: "Correlated error: the judge shares the generator's blind spot for Hinglish sarcasm and approves the wrong answer." },
  { context: "Customer: to much hai yaar … / … haan fir theek hai 5 saal kar do. process kya hai", answer: "not_interested — customer said the EMI is “to much”.", reference: "incorrect", judgeScore: 2, lesson: "The judge catches this one: the final stance is acceptance." },
  { context: "Customer: I might consider a loan next month. … I said I might consider it.", answer: "The customer demonstrates a nuanced yet ultimately positive disposition toward financial products. Considering the forward-looking statement regarding next month, the explicit engagement with the agent's questions, and typical behavioural patterns of customers in this segment, we can reasonably infer genuine interest. Label: interested.", reference: "incorrect", judgeScore: 4, lesson: "Verbosity bias: long, confident, fluent — and wrong. Judges often reward it." },
  { context: "Customer: I might consider a loan next month. … I said I might consider it.", answer: "insufficient_evidence — only “might consider… next month”.", reference: "correct", judgeScore: 3, lesson: "Verbosity bias, other side: the short correct answer gets a lukewarm score." },
  { context: "Customer: roz roz call karte ho, mera number hatao list se", answer: "not_interested — customer asks to be removed from the call list.", reference: "correct", judgeScore: 5, lesson: "Agreement." },
  { context: "Customer: mujhe nahi chahiye,, par mere bhai ko chahiye tha shayad", answer: "interested — “mere bhai ko chahiye tha”.", reference: "incorrect", judgeScore: 3, lesson: "Third-party interest. A 3/5 is ambiguous — which is why you must decide how to binarize judge scores up front." },
  { context: "Customer: zarurat to hai par main abhi student hu … papa ko puchna padega", answer: "insufficient_evidence — need exists but no job; will consult father.", reference: "correct", judgeScore: 5, lesson: "Agreement." },
];

export default function JudgeLab() {
  return (
    <Tabs defaultValue="compare">
      <TabsList>
        <TabsTrigger value="compare">Human vs LLM judge vs reference</TabsTrigger>
        <TabsTrigger value="position">Position bias</TabsTrigger>
        <TabsTrigger value="verbosity">Verbosity bias</TabsTrigger>
        <TabsTrigger value="self">Self-preference & disagreement</TabsTrigger>
      </TabsList>
      <TabsContent value="compare">
        <CompareTab />
      </TabsContent>
      <TabsContent value="position">
        <PositionTab />
      </TabsContent>
      <TabsContent value="verbosity">
        <VerbosityTab />
      </TabsContent>
      <TabsContent value="self">
        <SelfPrefTab />
      </TabsContent>
    </Tabs>
  );
}

function CompareTab() {
  const [mine, setMine] = useState<("correct" | "incorrect" | "")[]>(ITEMS.map(() => ""));
  const [revealed, setRevealed] = useState(false);
  const judgeBin = ITEMS.map((it) => (it.judgeScore >= 4 ? "correct" : "incorrect"));
  const refs = ITEMS.map((i) => i.reference);
  const cats = ["correct", "incorrect"];
  const kJudgeRef = cohenKappa(judgeBin, refs, cats);
  const kMeRef = cohenKappa(mine.map((m) => m || null), refs, cats);
  const kMeJudge = cohenKappa(mine.map((m) => m || null), judgeBin, cats);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>You are the human judge</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Mark each candidate answer correct or incorrect. Then compare with an LLM judge and the reference.</p>
        </div>
        <ModeBadge mode="precomputed" detail="LLM-judge scores are illustrative, constructed to exhibit documented judge biases. Not outputs of a specific model." />
      </CardHeader>
      <CardContent className="space-y-3">
        {ITEMS.map((it, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="font-mono text-xs text-muted-foreground">{it.context}</div>
            <div className="mt-1.5 text-sm">
              <span className="font-semibold">Answer: </span>
              {it.answer}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(["correct", "incorrect"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    const n = [...mine];
                    n[i] = v;
                    setMine(n);
                  }}
                  className={cn("cursor-pointer rounded-md border px-2.5 py-1 text-xs", mine[i] === v && (v === "correct" ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger"))}
                >
                  {v}
                </button>
              ))}
              {revealed && (
                <>
                  <Badge variant="info">LLM judge: {it.judgeScore}/5 → {judgeBin[i]}</Badge>
                  <Badge variant={it.reference === "correct" ? "success" : "danger"}>reference: {it.reference}</Badge>
                  {judgeBin[i] !== it.reference && <Badge variant="warning">judge wrong</Badge>}
                </>
              )}
            </div>
            {revealed && <div className="mt-1.5 text-xs text-muted-foreground">{it.lesson}</div>}
          </div>
        ))}
        <Button onClick={() => setRevealed(true)} disabled={mine.some((m) => !m)}>
          Reveal judge & reference
        </Button>
        {revealed && (
          <div className="grid gap-3 sm:grid-cols-3">
            <KappaBox label="LLM judge vs reference" k={kJudgeRef.kappa} acc={kJudgeRef.observed} />
            <KappaBox label="You vs reference" k={kMeRef.kappa} acc={kMeRef.observed} />
            <KappaBox label="You vs LLM judge" k={kMeJudge.kappa} acc={kMeJudge.observed} />
          </div>
        )}
        {revealed && (
          <Callout tone="info">
            The judge is a <b>measurement instrument</b>. Before trusting its scores on thousands of outputs, measure its agreement with careful human labels on a sample — exactly as you did here — and look at <i>where</i> it disagrees.
          </Callout>
        )}
      </CardContent>
    </Card>
  );
}

function KappaBox({ label, k, acc }: { label: string; k: number; acc: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">κ = {k.toFixed(2)}</div>
      <div className="text-xs text-muted-foreground">raw agreement {pct(acc)}</div>
    </div>
  );
}

function PositionTab() {
  const [bias, setBias] = useState(0.8);
  const [seed, setSeed] = useState(7);
  const sim = useMemo(() => {
    const r = rng(seed);
    const pairs = Array.from({ length: 30 }, () => Math.round((r() - 0.5) * 4) / 2); // quality diff A−B in {-1,-0.5,0,0.5,1}
    const choose = (diffFirstMinusSecond: number) => r() < 1 / (1 + Math.exp(-(2 * diffFirstMinusSecond + bias)));
    let consistent = 0;
    let flips = 0;
    let firstWins = 0;
    const rows = pairs.map((d) => {
      const abFirst = choose(d) ? "A" : "B"; // A shown first
      const baFirst = choose(-d) ? "B" : "A"; // B shown first
      if (abFirst === "A") firstWins++;
      if (baFirst === "B") firstWins++;
      if (abFirst === baFirst) consistent++;
      else flips++;
      return { d, abFirst, baFirst };
    });
    return { rows, consistent, flips, firstRate: firstWins / (2 * pairs.length) };
  }, [bias, seed]);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Pairwise judging in both orders</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">30 answer pairs, each judged twice: A shown first, then B shown first. A consistent judge picks the same winner both times.</p>
        </div>
        <ModeBadge mode="simulated" detail="P(pick first) = σ(2·quality_gap + bias). Seeded random draws." />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <LabeledSlider label="Position bias (logit offset toward first)" value={bias} onChange={setBias} min={0} max={2.5} step={0.1} format={(v) => v.toFixed(1)} />
            <Button size="sm" variant="outline" onClick={() => setSeed((s) => s + 1)}>
              <RefreshCw /> Re-sample
            </Button>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">First-shown wins</span><span className="font-mono">{pct(sim.firstRate)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Consistent verdicts</span><span className="font-mono">{sim.consistent}/30</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Verdict flips on swap</span><span className="font-mono text-danger">{sim.flips}/30</span></div>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-10">
            {sim.rows.map((r, i) => (
              <div key={i} className={cn("rounded p-1 text-center font-mono text-[10px]", r.abFirst === r.baFirst ? "bg-success-soft" : "bg-danger-soft")} title={`quality gap A−B = ${r.d}`}>
                <div>{r.abFirst}|{r.baFirst}</div>
                <div className="text-muted-foreground">{r.d > 0 ? "+" : ""}{r.d}</div>
              </div>
            ))}
          </div>
        </div>
        <Callout tone="info" title="Mitigation">
          Always run pairwise judgments in both orders. Count a win only when both orders agree; treat flips as ties. Report the flip rate — it's a direct measurement of your judge's position bias.
        </Callout>
      </CardContent>
    </Card>
  );
}

function VerbosityTab() {
  const [beta, setBeta] = useState(0.8);
  const data = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: 60 }, () => {
      const correct = r() < 0.55;
      const len = Math.round(15 + r() * 185);
      const score = Math.max(1, Math.min(5, 3 + (correct ? 1 : -1) + beta * ((len - 100) / 60) + gaussian(r) * 0.5));
      return { len, score: Number(score.toFixed(2)), correct };
    });
  }, [beta]);
  const longWrong = data.filter((d) => !d.correct && d.len > 120);
  const shortRight = data.filter((d) => d.correct && d.len < 60);
  const avg = (xs: { score: number }[]) => (xs.length ? xs.reduce((a, b) => a + b.score, 0) / xs.length : 0);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Does the judge reward length?</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Each dot is an answer. Colour = actually correct or not. Y = judge score.</p>
        </div>
        <ModeBadge mode="simulated" detail="score = 3 ± 1 (correctness) + β·(length − 100)/60 + noise" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <LabeledSlider label="Verbosity bias β" value={beta} onChange={setBeta} min={0} max={2} step={0.1} format={(v) => v.toFixed(1)} />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Long & wrong (avg score)</span><span className="font-mono">{avg(longWrong).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Short & correct (avg score)</span><span className="font-mono">{avg(shortRight).toFixed(2)}</span></div>
            </div>
            {avg(longWrong) >= avg(shortRight) && <Badge variant="danger">Long wrong answers outscore short correct ones</Badge>}
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <ScatterChart margin={{ left: -15, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="len" name="length (words)" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="number" dataKey="score" name="judge score" domain={[1, 5]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <ZAxis range={[40, 40]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Scatter name="actually correct" data={data.filter((d) => d.correct)} fill="var(--success)" />
                <Scatter name="actually wrong" data={data.filter((d) => !d.correct)} fill="var(--danger)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
        <Callout tone="info" title="Mitigation">
          Put explicit rubrics in the judge prompt (“length is not a criterion”), score the label and the evidence separately, control for length when comparing systems, and check score–length correlation within correct and within incorrect answers.
        </Callout>
      </CardContent>
    </Card>
  );
}

function SelfPrefTab() {
  const [delta, setDelta] = useState(0.15);
  const humanX = 0.5;
  const judgeX = Math.min(0.95, humanX + delta);
  const judgeB = { agreeWithA: 0.78 - delta / 2 };
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Self-preference, correlated errors and judge disagreement</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Humans rate Model X and Model Y as equally good. The judge belongs to Model X's family.</p>
        </div>
        <ModeBadge mode="simulated" />
      </CardHeader>
      <CardContent className="space-y-4">
        <LabeledSlider label="Self-preference strength" value={delta} onChange={setDelta} min={0} max={0.4} step={0.01} format={(v) => `+${Math.round(v * 100)} pts`} />
        <div className="grid gap-3 sm:grid-cols-2">
          <WinBar label="Human preference: X vs Y" x={humanX} />
          <WinBar label="Same-family LLM judge: X vs Y" x={judgeX} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3 text-sm">
            <div className="text-xs text-muted-foreground">Judge A (family X) vs Judge B (family Z)</div>
            <div className="text-xl font-semibold">{pct(judgeB.agreeWithA)} agree</div>
            <div className="text-xs text-muted-foreground">Two judges disagreeing tells you the scores are instrument-dependent.</div>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <div className="text-xs text-muted-foreground">Judge approval when generator is wrong — normal cases</div>
            <div className="text-xl font-semibold">~10%</div>
          </div>
          <div className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm">
            <div className="text-xs text-muted-foreground">…on Hinglish sarcasm (shared blind spot)</div>
            <div className="text-xl font-semibold">~70%</div>
            <div className="text-xs">Correlated errors: the judge can't catch mistakes it would make itself.</div>
          </div>
        </div>
        <Callout tone="warning" title="LLM-as-a-judge is not ground truth">
          Use a judge from a different model family when possible, validate against human labels on a stratified sample (report κ), audit slices where both
          generator and judge are likely to fail (sarcasm, code-mixing), and re-validate whenever the judge model or prompt changes.
        </Callout>
      </CardContent>
    </Card>
  );
}

function WinBar({ label, x }: { label: string; x: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-xs text-muted-foreground">{label}</div>
      <div className="flex h-6 overflow-hidden rounded text-[11px] font-semibold text-white">
        <div className="flex items-center justify-center bg-primary" style={{ width: `${x * 100}%` }}>X {pct(x)}</div>
        <div className="flex items-center justify-center bg-warning" style={{ width: `${(1 - x) * 100}%` }}>Y {pct(1 - x)}</div>
      </div>
    </div>
  );
}
