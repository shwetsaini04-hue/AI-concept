"use client";

import { useMemo, useState } from "react";
import { Dices, Loader2, Play } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, LabeledSlider, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { ProviderPicker } from "@/components/shared/ProviderPicker";
import { BackendProvider } from "@/lib/llm";
import { distribution, entropyBits, sampleIndex, type Cand } from "@/lib/llm/sampling";
import { cn, rng } from "@/lib/utils";

const NEXT: Cand[] = [
  { tok: " interested", logit: 3.2 },
  { tok: " unclear", logit: 2.4 },
  { tok: " not", logit: 2.0 },
  { tok: " maybe", logit: 1.3 },
  { tok: " definitely", logit: 0.8 },
  { tok: " positive", logit: 0.5 },
  { tok: " hmm", logit: -0.5 },
  { tok: " pizza", logit: -2.5 },
];

/** A tiny hand-built language model: each state lists next-token candidates with logits. */
const LM: Record<string, Cand[]> = {
  START: [
    { tok: "Customer", logit: 2.5 },
    { tok: "The caller", logit: 1.8 },
    { tok: "Honestly, the customer", logit: -0.5 },
  ],
  SUBJ: [
    { tok: "is", logit: 2.0 },
    { tok: "seems", logit: 1.4 },
    { tok: "sounds", logit: 0.6 },
    { tok: "might be", logit: 0.3 },
  ],
  STATE: [
    { tok: "interested", logit: 2.2 },
    { tok: "unsure", logit: 1.5 },
    { tok: "not interested", logit: 1.0 },
    { tok: "keen", logit: 0.4 },
    { tok: "confused", logit: -0.2 },
  ],
  TAIL: [
    { tok: "in a personal loan.", logit: 1.5 },
    { tok: ".", logit: 1.2 },
    { tok: "but wants a lower rate.", logit: 1.0 },
    { tok: "and asked about documents.", logit: 0.4 },
    { tok: "and mentioned pizza.", logit: -2.0 },
  ],
};
const ORDER = ["START", "SUBJ", "STATE", "TAIL"];

function generate(T: number, p: number, maxTokens: number, rand: () => number) {
  const parts: string[] = [];
  let used = 0;
  for (const state of ORDER) {
    const d = distribution(LM[state], T, p);
    const idx = sampleIndex(d.final, rand);
    const words = LM[state][idx].tok.split(" ");
    for (const w of words) {
      if (used >= maxTokens) return { text: parts.join(" "), truncated: true };
      parts.push(w);
      used++;
    }
  }
  return { text: parts.join(" ").replace(" .", "."), truncated: false };
}

export default function SamplingLab() {
  const [T, setT] = useState(1);
  const [p, setP] = useState(1);
  const [maxTokens, setMaxTokens] = useState(12);
  const [seed, setSeed] = useState(1);
  const [n, setN] = useState(10);

  const d = useMemo(() => distribution(NEXT, T, p), [T, p]);
  const chart = NEXT.map((c, i) => ({ tok: c.tok.trim(), "T = 1 (raw)": Number(d.base[i].toFixed(3)), "after T & top-p": Number(d.final[i].toFixed(3)) }));

  const gens = useMemo(() => {
    const r = rng(seed * 9973);
    return Array.from({ length: n }, () => generate(T, p, maxTokens, r));
  }, [T, p, maxTokens, seed, n]);
  const unique = new Set(gens.map((g) => g.text)).size;
  const bigrams = gens.flatMap((g) => {
    const w = g.text.split(" ");
    return w.slice(1).map((x, i) => `${w[i]} ${x}`);
  });
  const distinct2 = bigrams.length ? new Set(bigrams).size / bigrams.length : 0;
  const labelCounts = gens.reduce<Record<string, number>>((acc, g) => {
    const k = /not interested/.test(g.text) ? "not interested" : /interested|keen/.test(g.text) ? "interested/keen" : /unsure|confused/.test(g.text) ? "unsure/confused" : "(truncated)";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Next-token distribution</CardTitle>
            <p className="mt-1 font-mono text-xs text-muted-foreground">Context: “…the customer's intent for this call is ___”</p>
          </div>
          <ModeBadge mode="computed" detail="Toy logits, real softmax / temperature / nucleus mathematics." />
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <LabeledSlider label="Temperature" value={T} onChange={setT} min={0} max={2} step={0.05} format={(v) => v.toFixed(2)} hint="p_i ∝ exp(z_i / T). T→0 = greedy." />
            <LabeledSlider label="Top-p (nucleus)" value={p} onChange={setP} min={0.1} max={1} step={0.01} format={(v) => v.toFixed(2)} hint="Keep the smallest set of tokens with cumulative probability ≥ p." />
            <div className="space-y-1 rounded-md border p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Entropy</span><span className="font-mono">{entropyBits(d.final).toFixed(2)} bits</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tokens still possible</span><span className="font-mono">{d.final.filter((x) => x > 0).length}/{NEXT.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">P(top token)</span><span className="font-mono">{Math.max(...d.final).toFixed(3)}</span></div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="tok" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="T = 1 (raw)" fill="var(--muted-foreground)" fillOpacity={0.35} radius={[3, 3, 0, 0]} />
                <Bar dataKey="after T & top-p" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Repeated generations with the same prompt</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">A tiny hand-built language model samples one-sentence summaries using your temperature, top-p and max-tokens settings.</p>
          </div>
          <ModeBadge mode="simulated" detail="Toy 4-step language model; the sampling procedure is exactly what real decoders do." />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <LabeledSlider label="Max tokens (words here)" value={maxTokens} onChange={setMaxTokens} min={2} max={12} step={1} format={(v) => String(v)} />
            <LabeledSlider label="Number of runs" value={n} onChange={setN} min={3} max={30} step={1} format={(v) => String(v)} />
            <div className="flex items-end">
              <Button variant="outline" onClick={() => setSeed((s) => s + 1)}>
                <Dices /> Run again (new random seed)
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={unique === 1 ? "success" : "warning"}>{unique} unique output{unique === 1 ? "" : "s"} / {n}</Badge>
            <Badge variant="muted">distinct-2: {distinct2.toFixed(2)}</Badge>
            {Object.entries(labelCounts).map(([k, v]) => (
              <Badge key={k} variant={k === "(truncated)" ? "danger" : "info"}>
                {k}: {v}
              </Badge>
            ))}
          </div>
          <ol className="grid gap-1 font-mono text-[13px] sm:grid-cols-2">
            {gens.map((g, i) => (
              <li key={i} className={cn("rounded border px-2 py-1", g.truncated && "border-danger/40 bg-danger-soft")}>
                <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                {g.text}
                {g.truncated && <span className="ml-1 text-[10px] text-danger">[stopped: max_tokens]</span>}
              </li>
            ))}
          </ol>
          <Callout tone="info" title="What to notice">
            At T = 0 every run is identical (greedy). As T rises, lower-ranked tokens appear — including “not interested”: the <b>label itself</b> changes between runs of the same prompt. For classification and extraction,
            that variability is noise, so use low temperature. A tight top-p removes the absurd tail (“pizza”) while keeping some variety.
          </Callout>
        </CardContent>
      </Card>
      <RealRepeat T={T} p={p} />
    </div>
  );
}

function RealRepeat({ T, p }: { T: number; p: number }) {
  const [providerId, setProviderId] = useState("mock");
  const [label, setLabel] = useState("");
  const [outs, setOuts] = useState<string[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    setOuts(null);
    try {
      const prov = new BackendProvider(providerId, label);
      const res: string[] = [];
      for (let i = 0; i < 5; i++) {
        const r = await prov.generate({
          messages: [
            {
              role: "user",
              content:
                "In one short sentence, describe the customer's intent.\n\nCustomer: I might consider a loan next month.\nAgent: So you want a loan?\nCustomer: I said I might consider it.",
            },
          ],
          temperature: T,
          maxTokens: 60,
        });
        res.push(r.text.trim());
      }
      setOuts(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Repeat with a real model (5 calls at T = {T.toFixed(2)})</CardTitle>
        <ModeBadge mode="real-model" detail="Requires the backend and a provider API key." />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <ProviderPicker
            value={providerId}
            onChange={(id, l) => {
              setProviderId(id);
              setLabel(l);
            }}
          />
          <Button onClick={run} disabled={running || providerId === "mock"}>
            {running ? <Loader2 className="animate-spin" /> : <Play />} Run 5×
          </Button>
        </div>
        {p < 1 && <p className="text-xs text-muted-foreground">Note: top-p is not sent — providers differ in whether they accept both temperature and top-p. Only temperature is varied here.</p>}
        {error && <Callout tone="danger">{error}</Callout>}
        {outs && (
          <div className="space-y-1">
            <Badge variant="muted">{new Set(outs).size} unique / 5</Badge>
            <ol className="list-decimal space-y-1 pl-5 font-mono text-xs">
              {outs.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">Even at temperature 0, some providers return slightly different outputs across calls (batching, floating-point non-associativity, infrastructure changes). Pin model versions and log outputs.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
