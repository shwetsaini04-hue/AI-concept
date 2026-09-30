"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, LabeledSlider, Switch, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="number" step={step} min={0} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="font-mono" />
    </div>
  );
}

export default function CachingLab() {
  const [calls, setCalls] = useState(100_000);
  const [rulebook, setRulebook] = useState(5000);
  const [conv, setConv] = useState(1000);
  const [out, setOut] = useState(100);
  const [pIn, setPIn] = useState(3);
  const [pOut, setPOut] = useState(15);
  const [writeMult, setWriteMult] = useState(1.25);
  const [readMult, setReadMult] = useState(0.1);
  const [hit, setHit] = useState(0.95);
  const [batchDiscount, setBatchDiscount] = useState(0.5);
  const [staticFirst, setStaticFirst] = useState(true);

  const r = useMemo(() => {
    const effHit = staticFirst ? hit : 0;
    const outCost = (calls * out * pOut) / 1e6;
    const noCacheIn = (calls * (rulebook + conv) * pIn) / 1e6;
    const cacheIn =
      (calls * (1 - effHit) * rulebook * pIn * writeMult + calls * effHit * rulebook * pIn * readMult + calls * conv * pIn) / 1e6;
    const scenarios = [
      { name: "No caching", input: noCacheIn, output: outCost },
      { name: "Prompt caching", input: cacheIn, output: outCost },
      { name: "Batch API", input: noCacheIn * (1 - batchDiscount), output: outCost * (1 - batchDiscount) },
      { name: "Caching + batch", input: cacheIn * (1 - batchDiscount), output: outCost * (1 - batchDiscount) },
    ].map((s) => ({ ...s, total: s.input + s.output }));
    const prefillNoCache = rulebook + conv;
    const prefillCache = conv + rulebook * (1 - effHit);
    return { scenarios, effHit, totalTokens: calls * (rulebook + conv), rulebookTokens: calls * rulebook, prefillNoCache, prefillCache };
  }, [calls, rulebook, conv, out, pIn, pOut, writeMult, readMult, hit, batchDiscount, staticFirst]);

  const base = r.scenarios[0].total;
  const colors = ["var(--muted-foreground)", "var(--primary)", "var(--info)", "var(--success)"];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Cost simulator: 100,000 calls sharing one rulebook</CardTitle>
          <ModeBadge mode="computed" detail="Exact arithmetic on the prices and multipliers you enter. Defaults are illustrative — providers' real multipliers and TTLs differ." />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Num label="Calls" value={calls} onChange={setCalls} step={1000} />
            <Num label="Rulebook tokens (static)" value={rulebook} onChange={setRulebook} step={100} />
            <Num label="Conversation tokens" value={conv} onChange={setConv} step={100} />
            <Num label="Output tokens" value={out} onChange={setOut} step={10} />
            <Num label="$ / 1M input" value={pIn} onChange={setPIn} step={0.1} />
            <Num label="$ / 1M output" value={pOut} onChange={setPOut} step={0.5} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <LabeledSlider label="Cache write price multiplier" value={writeMult} onChange={setWriteMult} min={1} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
            <LabeledSlider label="Cache read price multiplier" value={readMult} onChange={setReadMult} min={0.05} max={1} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
            <LabeledSlider label="Cache hit rate" value={hit} onChange={setHit} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} hint="Misses happen when the cache expires between calls (TTL) or the prefix changes." />
            <LabeledSlider label="Batch API discount" value={batchDiscount} onChange={setBatchDiscount} min={0} max={0.7} step={0.05} format={(v) => `${Math.round(v * 100)}%`} />
          </div>
          <Switch
            checked={staticFirst}
            onChange={setStaticFirst}
            label={<span className="text-sm">Static rulebook placed <b>before</b> the conversation (cacheable prefix)</span>}
          />
          {!staticFirst && (
            <Callout tone="danger">
              With the conversation first, every prompt starts differently, so the prefix never matches: cache hit rate is effectively <b>0%</b>. Caching only reuses an identical <i>prefix</i>.
            </Callout>
          )}

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={r.scenarios} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tickFormatter={(v) => `$${formatNumber(v)}`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => formatMoney(Number(v))} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {r.scenarios.map((_, i) => (
                      <Cell key={i} fill={colors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {r.scenarios.map((s, i) => (
                <div key={s.name} className={cn("rounded-md border p-2.5 text-sm", i === 0 && "bg-muted")}>
                  <div className="flex justify-between font-medium">
                    <span>{s.name}</span>
                    <span className="font-mono">{formatMoney(s.total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      in {formatMoney(s.input)} · out {formatMoney(s.output)}
                    </span>
                    {i > 0 && <Badge variant="success">−{Math.round((1 - s.total / base) * 100)}%</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground">Total input tokens</div>
              <div className="text-lg font-semibold">{formatNumber(r.totalTokens)}</div>
              <div className="text-xs text-muted-foreground">of which rulebook: {formatNumber(r.rulebookTokens)} ({Math.round((100 * rulebook) / (rulebook + conv))}%)</div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground">Prefill work per call (tokens to compute)</div>
              <div className="text-lg font-semibold">
                {formatNumber(Math.round(r.prefillNoCache))} → {formatNumber(Math.round(r.prefillCache))}
              </div>
              <div className="text-xs text-muted-foreground">Fewer uncached tokens → lower time-to-first-token on cache hits.</div>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="text-xs text-muted-foreground">Latency with batch API</div>
              <div className="text-lg font-semibold">minutes → hours</div>
              <div className="text-xs text-muted-foreground">Asynchronous jobs: fine for nightly analytics, useless for live agent assist.</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Callout tone="info" title="Caching vs batching in one sentence each">
        <b>Prompt caching</b> stops you paying full price to re-process the same static prefix (rulebook, examples) on every call — it needs byte-identical prefixes and has an expiry.
        <b> Batching</b> trades latency for price and throughput: submit many independent requests as one job and collect results later.
      </Callout>
    </div>
  );
}
