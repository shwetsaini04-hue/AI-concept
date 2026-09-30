"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Line, LineChart } from "recharts";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, LabeledSlider, Switch, Callout } from "@/components/ui/primitives";
import { cTfidf, kmeans, pca2, silhouette } from "@/lib/embeddings";
import { EmbedModeSwitch, useEmbeddings, type EmbedMode } from "./useEmbed";
import { rng } from "@/lib/utils";

const SNIPPETS: { t: string; theme: string }[] = [
  { t: "I don't think the interest rate works for me.", theme: "Rate" },
  { t: "The EMI is too high.", theme: "Rate" },
  { t: "Can you reduce the interest rate?", theme: "Rate" },
  { t: "14 percent bahut zyada hai", theme: "Rate" },
  { t: "rate kam karo toh sochunga", theme: "Rate" },
  { t: "monthly installment is more than I can pay", theme: "Rate" },
  { t: "Metro Finance is giving a lower rate", theme: "Rate" },
  { t: "I am a student, I don't have a job yet", theme: "Eligibility" },
  { t: "my salary is below your minimum income", theme: "Eligibility" },
  { t: "CIBIL score low hai mera", theme: "Eligibility" },
  { t: "you rejected my application last year", theme: "Eligibility" },
  { t: "I'm self employed, will I qualify?", theme: "Eligibility" },
  { t: "call me next month, not now", theme: "Timing" },
  { t: "abhi busy hu, shaam ko call karo", theme: "Timing" },
  { t: "after Diwali I will think about it", theme: "Timing" },
  { t: "I'm driving, call later", theme: "Timing" },
  { t: "maybe next year when I buy the car", theme: "Timing" },
  { t: "too many documents required", theme: "Documents" },
  { t: "I don't have salary slips for 6 months", theme: "Documents" },
  { t: "aadhar pan sab dena padega kya", theme: "Documents" },
  { t: "the paperwork is too complicated", theme: "Documents" },
  { t: "KYC process is a hassle", theme: "Documents" },
  { t: "I already took a loan from another bank", theme: "Not needed" },
  { t: "mujhe loan ki zarurat nahi hai", theme: "Not needed" },
  { t: "we don't need any money right now", theme: "Not needed" },
  { t: "I have enough savings", theme: "Not needed" },
];

const COLORS = ["#0f766e", "#b45309", "#7c3aed", "#be123c", "#1d4ed8", "#4d7c0f", "#a16207", "#0e7490"];

export default function ClusteringLab() {
  const [mode, setMode] = useState<EmbedMode>("tfidf");
  const [k, setK] = useState(5);
  const [showThemes, setShowThemes] = useState(false);
  const [names, setNames] = useState<Record<number, string>>({});
  const texts = useMemo(() => SNIPPETS.map((s) => s.t), []);
  const { vectors, busy } = useEmbeddings(texts, mode);

  const result = useMemo(() => {
    if (!vectors || vectors.length !== texts.length) return null;
    const km = kmeans(vectors, k, rng(7));
    const pts = pca2(vectors);
    const kw = cTfidf(texts, km.labels);
    const sil = silhouette(vectors, km.labels);
    const byK = [2, 3, 4, 5, 6, 7, 8].map((kk) => ({ k: kk, silhouette: Number(silhouette(vectors, kmeans(vectors, kk, rng(7)).labels).toFixed(3)) }));
    // purity against hidden themes
    let pure = 0;
    for (let c = 0; c < k; c++) {
      const members = SNIPPETS.filter((_, i) => km.labels[i] === c);
      const counts: Record<string, number> = {};
      members.forEach((m) => (counts[m.theme] = (counts[m.theme] ?? 0) + 1));
      pure += Math.max(0, ...Object.values(counts));
    }
    return { labels: km.labels, pts, kw, sil, byK, purity: pure / SNIPPETS.length };
  }, [vectors, k, texts]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Clustering laboratory: discover objection themes</CardTitle>
          <p className="text-sm text-muted-foreground">{SNIPPETS.length} customer objection snippets. Embed → reduce → cluster → describe, the same shape as BERTopic.</p>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            {["Embed (TF-IDF or MiniLM)", "Reduce (PCA ≈ UMAP)", "Cluster (k-means ≈ HDBSCAN)", "Describe (c-TF-IDF)"].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-1.5">
                <Badge variant="muted">{s}</Badge>
                {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <EmbedModeSwitch mode={mode} setMode={setMode} />
          <div className="grid gap-4 md:grid-cols-[260px_1fr]">
            <div className="space-y-4">
              <LabeledSlider label="Number of clusters k" value={k} onChange={setK} min={2} max={8} step={1} format={(v) => String(v)} />
              <Switch checked={showThemes} onChange={setShowThemes} label={<span className="text-sm">Reveal hidden themes</span>} />
              {result && (
                <div className="space-y-1 rounded-lg border p-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Silhouette</span><span className="font-mono">{result.sil.toFixed(3)}</span></div>
                  {showThemes && <div className="flex justify-between"><span className="text-muted-foreground">Purity vs themes</span><span className="font-mono">{(result.purity * 100).toFixed(0)}%</span></div>}
                </div>
              )}
              {result && (
                <div className="h-32">
                  <div className="text-[11px] text-muted-foreground">Silhouette by k</div>
                  <ResponsiveContainer>
                    <LineChart data={result.byK} margin={{ left: -25, right: 5 }}>
                      <XAxis dataKey="k" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                      <Line dataKey="silhouette" stroke="var(--primary)" strokeWidth={2} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="relative h-80 rounded-lg border bg-subtle">
              {(busy || !result) && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Embedding & clustering…
                </div>
              )}
              {result && (
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" dataKey="x" tick={false} name="PC1" />
                    <YAxis type="number" dataKey="y" tick={false} name="PC2" />
                    <ZAxis range={[70, 70]} />
                    <Tooltip
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                      content={({ payload }) => {
                        const p = payload?.[0]?.payload as { t: string; theme: string } | undefined;
                        return p ? (
                          <div className="rounded-md border bg-popover px-2 py-1 text-xs shadow">
                            {p.t}
                            {showThemes && <div className="text-muted-foreground">theme: {p.theme}</div>}
                          </div>
                        ) : null;
                      }}
                    />
                    {Array.from({ length: k }, (_, c) => (
                      <Scatter
                        key={c}
                        name={`cluster ${c + 1}`}
                        data={SNIPPETS.map((s, i) => ({ ...s, x: result.pts[i][0], y: result.pts[i][1], c: result.labels[i] })).filter((p) => p.c === c)}
                        fill={COLORS[c % COLORS.length]}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: k }, (_, c) => {
            const members = SNIPPETS.filter((_, i) => result.labels[i] === c);
            return (
              <Card key={c}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: COLORS[c % COLORS.length] }} />
                    <Input value={names[c] ?? ""} onChange={(e) => setNames((n) => ({ ...n, [c]: e.target.value }))} placeholder={`Name cluster ${c + 1}…`} className="h-8" />
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(result.kw[c] ?? []).map((w) => (
                      <Badge key={w} variant="info">
                        {w}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 font-mono text-xs">
                    {members.map((m) => (
                      <li key={m.t}>
                        {m.t}
                        {showThemes && <span className="ml-1 text-[10px] text-muted-foreground">[{m.theme}]</span>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Callout tone="info" title="Honest approximations">
        This lab uses PCA and k-means for speed and transparency; BERTopic uses UMAP (non-linear reduction) and HDBSCAN (density clustering that labels outliers as noise and chooses the number of clusters itself).
        Whichever you use: clusters are hypotheses. A human must read them, name them, and decide whether they deserve to become taxonomy labels.
      </Callout>
    </div>
  );
}
