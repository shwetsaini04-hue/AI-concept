"use client";

import { useEffect, useMemo, useState } from "react";
import type { Tiktoken } from "js-tiktoken/lite";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, LabeledSlider, Select, Switch, Textarea, Badge, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { ENCODINGS, getEncoder, pieces, wordCount, type EncodingName } from "@/lib/nlp/tokenizer";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

const CHIP_COLORS = [
  "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100",
  "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100",
];

const PRESETS: { label: string; text: string }[] = [
  { label: "English", text: "I need a personal loan of five lakh rupees." },
  { label: "Hindi (Devanagari)", text: "मुझे पाँच लाख रुपये का पर्सनल लोन चाहिए।" },
  { label: "Hinglish", text: "mujhe 5 lakh ka personal loan chahiye" },
  { label: "Romanized Hindi", text: "mujhe paanch laakh rupaye ka vyaktigat rin chahiye" },
  { label: "Noisy transcript", text: "sir mujhe ek persnal lon chahiye... 5 lac ka, haan haan 5 lac" },
];

const PAIRS = [
  { a: "I need a loan", b: "mujhe loan chahiye" },
  { a: "I am interested in taking a personal loan.", b: "main personal loan lene mein interested hu" },
];

export default function TokenizationLab() {
  const [encName, setEncName] = useState<EncodingName>("o200k_base");
  const [enc, setEnc] = useState<Tiktoken | null>(null);
  const [encs, setEncs] = useState<Partial<Record<EncodingName, Tiktoken>>>({});
  const [text, setText] = useState("I am interested in taking a personal loan.");
  const [showIds, setShowIds] = useState(false);
  const [price, setPrice] = useState(3);
  const [calls, setCalls] = useState(100000);
  const [chunk, setChunk] = useState(0);

  useEffect(() => {
    let alive = true;
    setEnc(null);
    getEncoder(encName).then((e) => alive && setEnc(e));
    return () => {
      alive = false;
    };
  }, [encName]);

  useEffect(() => {
    Promise.all(ENCODINGS.map((e) => getEncoder(e.id).then((x) => [e.id, x] as const))).then((xs) => setEncs(Object.fromEntries(xs)));
  }, []);

  const ids = useMemo(() => (enc ? enc.encode(text) : []), [enc, text]);
  const ps = useMemo(() => (enc ? pieces(enc, ids) : []), [enc, ids]);
  const words = wordCount(text);
  const chars = [...text].length;

  const comparison = useMemo(() => {
    if (!encs.o200k_base || !encs.cl100k_base) return [];
    return PRESETS.map((p) => ({
      name: p.label,
      words: wordCount(p.text),
      chars: [...p.text].length,
      o200k: encs.o200k_base!.encode(p.text).length,
      cl100k: encs.cl100k_base!.encode(p.text).length,
    }));
  }, [encs]);

  const pairs = useMemo(() => {
    if (!encs.o200k_base) return [];
    return PAIRS.map((p) => ({ ...p, ta: encs.o200k_base!.encode(p.a).length, tb: encs.o200k_base!.encode(p.b).length }));
  }, [encs]);

  const cost = (ids.length * calls * price) / 1_000_000;

  let tokenCounter = 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Text → tokens → token IDs → count → cost</CardTitle>
          <ModeBadge mode="real-local" detail="Real byte-level BPE tokenizer (js-tiktoken). Other providers (Claude, Gemini, Llama) use different tokenizers — counts differ." />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => setText(p.text)} className="cursor-pointer rounded-md border bg-card px-2.5 py-1 text-xs hover:bg-muted">
                {p.label}
              </button>
            ))}
          </div>
          <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className="font-mono" aria-label="Text to tokenize" />
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="enc">Tokenizer</Label>
              <Select id="enc" value={encName} onChange={(e) => setEncName(e.target.value as EncodingName)}>
                {ENCODINGS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </Select>
            </div>
            <Switch checked={showIds} onChange={setShowIds} label={<span className="text-xs">Show token IDs</span>} />
            <div className="min-w-[220px] flex-1">
              <LabeledSlider label="Chunk every N tokens (0 = off)" value={chunk} onChange={setChunk} min={0} max={20} step={1} format={(v) => (v ? `${v}` : "off")} />
            </div>
          </div>

          <div className="min-h-[64px] rounded-lg border bg-subtle p-3 font-mono text-sm leading-8">
            {!enc ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading tokenizer…
              </span>
            ) : (
              ps.map((p, i) => {
                const startIdx = tokenCounter;
                tokenCounter += p.ids.length;
                const boundary = chunk > 0 && i > 0 && Math.floor((startIdx - 1) / chunk) !== Math.floor(startIdx / chunk) ? true : false;
                return (
                  <span key={i}>
                    {boundary && <span className="mx-0.5 inline-block h-6 w-0.5 translate-y-1.5 bg-danger" title="chunk boundary" />}
                    <span
                      className={cn("tok rounded px-0.5 py-0.5", CHIP_COLORS[i % CHIP_COLORS.length], p.multiByte && "outline outline-1 outline-dashed outline-foreground/40")}
                      title={`${p.ids.length > 1 ? `${p.ids.length} tokens: ` : "token "}${p.ids.join(", ")}`}
                    >
                      {p.text.replace(/ /g, "·")}
                      {showIds && <sub className="ml-0.5 text-[9px] opacity-70">{p.ids.join("+")}</sub>}
                    </span>
                  </span>
                );
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            “·” marks a space that belongs to the token. Dashed outlines are characters that needed several byte-level tokens (common in Devanagari).
            {chunk > 0 && " Red bars are naive fixed-size chunk boundaries — notice they can cut words and numbers apart."}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MiniStat label="Characters" value={formatNumber(chars)} />
            <MiniStat label="Words" value={formatNumber(words)} />
            <MiniStat label="Tokens" value={formatNumber(ids.length)} highlight />
            <MiniStat label="Tokens / word" value={words ? (ids.length / words).toFixed(2) : "—"} />
            <MiniStat label="Chars / token" value={ids.length ? (chars / ids.length).toFixed(2) : "—"} />
          </div>

          <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Example input price ($ per 1M tokens)</Label>
              <Input type="number" step="0.1" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
              <p className="text-[11px] text-muted-foreground">Illustrative. Check your provider's current pricing.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Calls (e.g. transcripts per month)</Label>
              <Input type="number" min={1} value={calls} onChange={(e) => setCalls(Number(e.target.value) || 0)} />
            </div>
            <div className="rounded-md bg-primary-soft p-3">
              <div className="text-xs text-muted-foreground">Estimated input cost for this text × calls</div>
              <div className="text-2xl font-semibold text-primary">{formatMoney(cost)}</div>
              <div className="text-xs text-muted-foreground">{formatNumber(ids.length * calls)} tokens</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Same meaning, different scripts: measured, not assumed</CardTitle>
          <ModeBadge mode="real-local" />
        </CardHeader>
        <CardContent className="space-y-4">
          {comparison.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading both tokenizers…
            </div>
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={comparison} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="o200k" name="o200k_base tokens" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cl100k" name="cl100k_base tokens" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-3">Variant</th>
                      <th className="py-1 pr-3">Text</th>
                      <th className="py-1 pr-3 text-right">Words</th>
                      <th className="py-1 pr-3 text-right">o200k</th>
                      <th className="py-1 text-right">cl100k</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((c, i) => (
                      <tr key={c.name} className="border-t">
                        <td className="py-1.5 pr-3 font-medium">{c.name}</td>
                        <td className="py-1.5 pr-3 font-mono text-xs">{PRESETS[i].text}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{c.words}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{c.o200k}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.cl100k}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {pairs.map((p) => (
                  <div key={p.a} className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between font-mono text-xs">
                      <span>{p.a}</span>
                      <Badge variant="muted">{p.ta} tokens</Badge>
                    </div>
                    <div className="mt-1.5 flex justify-between font-mono text-xs">
                      <span>{p.b}</span>
                      <Badge variant="muted">{p.tb} tokens</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Callout tone="info" title="How to read this">
                These counts come from the real tokenizers on these exact strings. They show the <em>direction</em> of the effect for these examples;
                the size depends on the tokenizer, the spelling and the text. Measure your own transcripts before budgeting — never apply a fixed
                “Hinglish costs X% more” rule.
              </Callout>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-md border p-2.5", highlight && "border-primary/40 bg-primary-soft")}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-semibold tabular-nums", highlight && "text-primary")}>{value}</div>
    </div>
  );
}
