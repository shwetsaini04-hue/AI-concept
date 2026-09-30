"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { CartesianGrid, LabelList, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea, Callout } from "@/components/ui/primitives";
import { cosine, pca2 } from "@/lib/embeddings";
import { EmbedModeSwitch, useEmbeddings, type EmbedMode } from "./useEmbed";
import { cn } from "@/lib/utils";

const DEFAULT = ["personal loan", "loan application", "borrow money", "credit card", "pizza", "mujhe loan chahiye", "I need some money urgently", "EMI is too high", "interest rate kam karo", "I don't want a loan"];

export default function EmbeddingsLab() {
  const [text, setText] = useState(DEFAULT.join("\n"));
  const [mode, setMode] = useState<EmbedMode>("tfidf");
  const [query, setQuery] = useState("customer wants to take a loan");
  const sentences = useMemo(() => text.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 24), [text]);
  const all = useMemo(() => [...sentences, query.trim() || " "], [sentences, query]);
  const { vectors, busy, error } = useEmbeddings(all, mode);

  const ready = vectors && vectors.length === all.length;
  const sv = ready ? vectors!.slice(0, sentences.length) : null;
  const qv = ready ? vectors![sentences.length] : null;
  const points = useMemo(() => (sv ? pca2(sv).map(([x, y], i) => ({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)), label: sentences[i] })) : []), [sv, sentences]);
  const sim = useMemo(() => (sv ? sv.map((a) => sv.map((b) => cosine(a, b))) : []), [sv]);
  const ranked = useMemo(() => (sv && qv ? sentences.map((s, i) => ({ s, score: cosine(qv, sv[i]) })).sort((a, b) => b.score - a.score) : []), [sv, qv, sentences]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Where do sentences land in vector space?</CardTitle>
          <EmbedModeSwitch mode={mode} setMode={setMode} />
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-1">
            <Label>Sentences (one per line, max 24)</Label>
            <Textarea rows={12} className="font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="relative h-80 rounded-lg border bg-subtle">
            {(busy || !ready) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Embedding…
              </div>
            )}
            {error && <div className="p-3 text-sm text-danger">{error}</div>}
            {ready && (
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 40, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" dataKey="x" name="PC1" tick={false} />
                  <YAxis type="number" dataKey="y" name="PC2" tick={false} />
                  <ZAxis range={[60, 60]} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={() => ""} labelFormatter={() => ""} />
                  <Scatter data={points} fill="var(--primary)">
                    <LabelList dataKey="label" position="top" style={{ fontSize: 10, fill: "var(--foreground)" }} />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Cosine similarity matrix</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {ready && (
              <table className="text-[10px]">
                <thead>
                  <tr>
                    <th />
                    {sentences.map((s, j) => (
                      <th key={j} className="h-28 w-8 align-bottom">
                        <div className="w-4 origin-bottom-left translate-x-3 -rotate-60 whitespace-nowrap font-normal text-muted-foreground">{s.slice(0, 22)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sentences.map((s, i) => (
                    <tr key={i}>
                      <th className="max-w-[160px] truncate pr-2 text-right font-normal text-muted-foreground">{s}</th>
                      {sim[i].map((v, j) => (
                        <td key={j} className="p-0">
                          <div
                            className="flex h-8 w-8 items-center justify-center font-mono"
                            style={{ background: `color-mix(in oklab, var(--primary) ${Math.round(Math.max(0, v) * 80)}%, transparent)`, color: v > 0.6 ? "var(--primary-foreground)" : undefined }}
                            title={`${sentences[i]} ↔ ${sentences[j]}: ${v.toFixed(3)}`}
                          >
                            {v.toFixed(2).replace(/^0/, "")}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Semantic search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a query…" />
            <ol className="space-y-1">
              {ranked.map((r, i) => (
                <li key={r.s} className="grid grid-cols-[18px_1fr_60px] items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                  <span className="truncate font-mono text-xs">{r.s}</span>
                  <div className="relative h-4 rounded bg-muted">
                    <div className={cn("h-full rounded bg-primary")} style={{ width: `${Math.max(0, r.score) * 100}%` }} />
                    <span className="absolute inset-0 text-center font-mono text-[9px] leading-4">{r.score.toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      <Callout tone="info" title="Compare the two modes">
        In <b>lexical</b> mode, “borrow money” and “personal loan” share no character n-grams, so they look unrelated, while “I don't want a loan” looks close to “loan application”. Load the <b>neural</b> model: paraphrases move
        together — but negations often stay close to their positive versions, and Romanized Hindi is handled poorly by an English-only model. Similarity is a property of the model, not of the text.
      </Callout>
    </div>
  );
}
