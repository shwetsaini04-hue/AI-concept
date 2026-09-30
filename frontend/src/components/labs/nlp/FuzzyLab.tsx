"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, LabeledSlider, Select } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { levenshtein, jaroWinkler, METRIC_LABEL, similarity, type SimilarityMetric } from "@/lib/nlp/fuzzy";
import { binaryMetrics } from "@/lib/metrics/classification";
import { cn, pct } from "@/lib/utils";

interface Pair {
  mention: string;
  entry: string;
  match: boolean;
  note?: string;
}

const PAIRS: Pair[] = [
  { mention: "persnal loan", entry: "personal loan", match: true },
  { mention: "personal lon", entry: "personal loan", match: true },
  { mention: "pesonal lone", entry: "personal loan", match: true },
  { mention: "personal lawn", entry: "personal loan", match: true, note: "ASR error" },
  { mention: "loan personal", entry: "personal loan", match: true, note: "word order" },
  { mention: "hom loan", entry: "home loan", match: true },
  { mention: "home lon", entry: "home loan", match: true },
  { mention: "car lone", entry: "car loan", match: true },
  { mention: "gold lon", entry: "gold loan", match: true },
  { mention: "credit crd", entry: "credit card", match: true },
  { mention: "two wheeler loan", entry: "vehicle loan", match: true, note: "synonym — lexical similarity can't see it" },
  { mention: "professional loan", entry: "personal loan", match: false, note: "different product" },
  { mention: "business loan", entry: "personal loan", match: false },
  { mention: "home loan", entry: "gold loan", match: false },
  { mention: "car loan", entry: "gold loan", match: false },
  { mention: "hold on", entry: "gold loan", match: false, note: "filler phrase" },
  { mention: "credit score", entry: "credit card", match: false },
  { mention: "education loan", entry: "vehicle loan", match: false },
  { mention: "personal", entry: "personal loan", match: false, note: "incomplete mention" },
  { mention: "loan", entry: "home loan", match: false, note: "too generic" },
];

const METRICS: SimilarityMetric[] = ["levenshtein", "damerau", "jaro-winkler", "bigram", "trigram", "token-jaccard", "token-sort"];

export default function FuzzyLab() {
  const [a, setA] = useState("persnal loan");
  const [b, setB] = useState("personal loan");
  const [metric, setMetric] = useState<SimilarityMetric>("levenshtein");
  const [threshold, setThreshold] = useState(0.8);

  const lev = useMemo(() => levenshtein(a.toLowerCase(), b.toLowerCase()), [a, b]);
  const jw = useMemo(() => jaroWinkler(a.toLowerCase(), b.toLowerCase()), [a, b]);
  const showMatrix = a.length <= 18 && b.length <= 18;

  // mark path cells from alignment ops
  const pathCells = useMemo(() => {
    const cells = new Set<string>(["0,0"]);
    let i = 0;
    let j = 0;
    for (const op of lev.ops) {
      if (op.op === "match" || op.op === "sub") {
        i++;
        j++;
      } else if (op.op === "del") i++;
      else j++;
      cells.add(`${i},${j}`);
    }
    return cells;
  }, [lev]);

  const scored = useMemo(() => PAIRS.map((p) => ({ ...p, score: similarity(metric, p.mention, p.entry) })), [metric]);
  const counts = useMemo(() => {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (const p of scored) {
      const pred = p.score >= threshold;
      if (pred && p.match) tp++;
      else if (pred && !p.match) fp++;
      else if (!pred && p.match) fn++;
      else tn++;
    }
    return { tp, fp, tn, fn };
  }, [scored, threshold]);
  const m = binaryMetrics(counts);

  const curve = useMemo(() => {
    const pts = [];
    for (let t = 0.3; t <= 1.0001; t += 0.02) {
      let tp = 0, fp = 0, tn = 0, fn = 0;
      for (const p of scored) {
        const pred = p.score >= t;
        if (pred && p.match) tp++;
        else if (pred) fp++;
        else if (p.match) fn++;
        else tn++;
      }
      const bm = binaryMetrics({ tp, fp, tn, fn });
      pts.push({ t: Number(t.toFixed(2)), precision: bm.precision, recall: bm.recall, f1: bm.f1 });
    }
    return pts;
  }, [scored]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Compare two strings</CardTitle>
          <ModeBadge mode="computed" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>String A (noisy mention)</Label>
              <Input value={a} onChange={(e) => setA(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label>String B (canonical entry)</Label>
              <Input value={b} onChange={(e) => setB(e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Levenshtein edit distance</div>
                  <div className="text-3xl font-semibold text-primary">{lev.distance}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Normalized similarity = 1 − d / max(len)</div>
                  <div className="text-3xl font-semibold">{pct(similarity("levenshtein", a, b), 1)}</div>
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">One optimal alignment</div>
                <div className="flex flex-wrap gap-0.5 font-mono text-sm">
                  {lev.ops.map((o, i) => (
                    <span
                      key={i}
                      title={o.op}
                      className={cn(
                        "flex min-w-6 flex-col items-center rounded px-1 py-0.5",
                        o.op === "match" && "bg-muted",
                        o.op === "sub" && "bg-warning-soft text-warning",
                        o.op === "ins" && "bg-success-soft text-success",
                        o.op === "del" && "bg-danger-soft text-danger",
                      )}
                    >
                      <span>{o.a === " " ? "·" : (o.a ?? "–")}</span>
                      <span>{o.b === " " ? "·" : (o.b ?? "–")}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                  <span className="text-warning">■ substitution</span>
                  <span className="text-success">■ insertion</span>
                  <span className="text-danger">■ deletion</span>
                </div>
              </div>
              {showMatrix ? (
                <div className="overflow-x-auto">
                  <div className="mb-1 text-xs text-muted-foreground">Dynamic-programming matrix (cell = min edits between prefixes; highlighted = optimal path)</div>
                  <table className="border-collapse font-mono text-[11px]">
                    <thead>
                      <tr>
                        <th className="h-6 w-6" />
                        <th className="h-6 w-6 text-muted-foreground">ε</th>
                        {[...b.toLowerCase()].map((ch, j) => (
                          <th key={j} className="h-6 w-6 text-muted-foreground">
                            {ch === " " ? "·" : ch}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lev.matrix.map((row, i) => (
                        <tr key={i}>
                          <th className="h-6 w-6 text-muted-foreground">{i === 0 ? "ε" : a.toLowerCase()[i - 1] === " " ? "·" : a.toLowerCase()[i - 1]}</th>
                          {row.map((v, j) => (
                            <td key={j} className={cn("h-6 w-6 border text-center", pathCells.has(`${i},${j}`) && "bg-primary-soft font-bold text-primary")}>
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">(Matrix hidden for strings longer than 18 characters.)</p>
              )}
            </div>
            <div className="rounded-lg border">
              <div className="border-b bg-muted px-3 py-2 text-xs font-semibold">All similarity measures</div>
              <table className="w-full text-sm">
                <tbody>
                  {METRICS.map((mt) => (
                    <tr key={mt} className="border-b last:border-0">
                      <td className="px-3 py-1.5">{METRIC_LABEL[mt]}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{similarity(mt, a, b).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                Jaro = {jw.jaro.toFixed(3)}, common prefix = {jw.prefix} → JW = J + {jw.prefix}·0.1·(1−J)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Threshold lab: matching noisy mentions to a product catalogue</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Each pair has a gold label. Move the threshold and watch false positives and false negatives trade off.</p>
          </div>
          <ModeBadge mode="computed" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Similarity measure</Label>
                <Select value={metric} onChange={(e) => setMetric(e.target.value as SimilarityMetric)} className="w-full">
                  {METRICS.map((mt) => (
                    <option key={mt} value={mt}>
                      {METRIC_LABEL[mt]}
                    </option>
                  ))}
                </Select>
              </div>
              <LabeledSlider label="Match threshold" value={threshold} onChange={setThreshold} min={0.3} max={1} step={0.01} format={(v) => v.toFixed(2)} />
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <Cell label="TP" v={counts.tp} cls="bg-success-soft text-success" />
                <Cell label="FP" v={counts.fp} cls="bg-danger-soft text-danger" />
                <Cell label="FN" v={counts.fn} cls="bg-warning-soft text-warning" />
                <Cell label="TN" v={counts.tn} cls="bg-muted" />
              </div>
              <div className="space-y-1 text-sm">
                <Row k="Precision" v={pct(m.precision, 0)} />
                <Row k="Recall" v={pct(m.recall, 0)} />
                <Row k="F1" v={m.f1.toFixed(2)} />
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={curve} margin={{ left: -15, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="t" type="number" domain={[0.3, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => Number(v).toFixed(2)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine x={Number(threshold.toFixed(2))} stroke="var(--foreground)" strokeDasharray="4 4" />
                  <Line type="stepAfter" dataKey="precision" stroke="var(--primary)" dot={false} strokeWidth={2} />
                  <Line type="stepAfter" dataKey="recall" stroke="var(--warning)" dot={false} strokeWidth={2} />
                  <Line type="stepAfter" dataKey="f1" stroke="var(--info)" dot={false} strokeWidth={2} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">Mention</th>
                  <th className="py-1 pr-2">Catalogue entry</th>
                  <th className="py-1 pr-2">Gold</th>
                  <th className="py-1 pr-2 text-right">Score</th>
                  <th className="py-1">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {scored
                  .slice()
                  .sort((x, y) => y.score - x.score)
                  .map((p) => {
                    const pred = p.score >= threshold;
                    const outcome = pred ? (p.match ? "TP" : "FP") : p.match ? "FN" : "TN";
                    return (
                      <tr key={p.mention + p.entry} className="border-t">
                        <td className="py-1.5 pr-2 font-mono text-xs">{p.mention}</td>
                        <td className="py-1.5 pr-2 font-mono text-xs">{p.entry}</td>
                        <td className="py-1.5 pr-2 text-xs">
                          {p.match ? "match" : "different"}
                          {p.note && <span className="text-muted-foreground"> · {p.note}</span>}
                        </td>
                        <td className="py-1.5 pr-2 text-right font-mono text-xs">{p.score.toFixed(3)}</td>
                        <td className="py-1.5">
                          <Badge variant={outcome === "TP" ? "success" : outcome === "FP" ? "danger" : outcome === "FN" ? "warning" : "muted"}>{outcome}</Badge>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Cell({ label, v, cls }: { label: string; v: number; cls: string }) {
  return (
    <div className={cn("rounded-md p-2", cls)}>
      <div className="font-semibold">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{v}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b py-1 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}
