"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { DATASET, INTENT_LABEL, NOISE_LABELS, type Conversation, type NoiseTag } from "@/content/dataset";
import { ENTITY_COLOR } from "@/components/shared/entityColors";
import { SpeakerTag } from "@/components/shared/TranscriptViewer";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Switch } from "@/components/ui/primitives";
import { cn, formatNumber } from "@/lib/utils";

function highlight(text: string, entities: { text: string; type: keyof typeof ENTITY_COLOR }[] = []) {
  const spans: { start: number; end: number; type: keyof typeof ENTITY_COLOR }[] = [];
  for (const e of entities) {
    const i = text.indexOf(e.text);
    if (i >= 0 && !spans.some((s) => s.start < i + e.text.length && i < s.end)) spans.push({ start: i, end: i + e.text.length, type: e.type });
  }
  spans.sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let cur = 0;
  spans.forEach((s, k) => {
    if (s.start > cur) out.push(text.slice(cur, s.start));
    out.push(
      <span key={k} className={cn("rounded px-0.5 ring-1", ENTITY_COLOR[s.type])} title={s.type}>
        {text.slice(s.start, s.end)}
        <sup className="ml-0.5 text-[8px] font-bold">{s.type}</sup>
      </span>,
    );
    cur = s.end;
  });
  if (cur < text.length) out.push(text.slice(cur));
  return out;
}

export default function DatasetPage() {
  const [lang, setLang] = useState("");
  const [quality, setQuality] = useState("");
  const [noise, setNoise] = useState<NoiseTag | "">("");
  const [intent, setIntent] = useState("");
  const [selId, setSelId] = useState(DATASET[0].id);
  const [showGold, setShowGold] = useState(true);
  const [useAsr, setUseAsr] = useState(false);

  const list = useMemo(
    () =>
      DATASET.filter(
        (c) => (!lang || c.language === lang) && (!quality || c.quality === quality) && (!noise || c.noise.includes(noise)) && (!intent || c.gold.intent === intent),
      ),
    [lang, quality, noise, intent],
  );
  const c: Conversation = DATASET.find((x) => x.id === selId) ?? DATASET[0];

  function exportJson() {
    const blob = new Blob([JSON.stringify(DATASET, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synthetic_transcripts.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Synthetic transcript dataset</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {DATASET.length} fictional loan-sales calls with deliberate noise: Hinglish, Romanized Hindi, spelling and ASR errors, repeated words, broken punctuation, number-format variation, abbreviations,
            code-switching and diarization errors. Each has gold annotations for speakers, dialogue acts, entities, intent and evidence. The same calls are reused across the labs and the capstone.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModeBadge mode="precomputed" detail="Hand-written synthetic data. Bank names are invented." />
          <Button variant="outline" size="sm" onClick={exportJson}>
            <Download /> Export JSON
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          <option value="">All languages</option>
          {["Hinglish", "English", "Romanized Hindi"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
        <Select value={quality} onChange={(e) => setQuality(e.target.value)} aria-label="Quality">
          <option value="">All quality tiers</option>
          {["clean", "noisy", "very noisy"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
        <Select value={noise} onChange={(e) => setNoise(e.target.value as NoiseTag)} aria-label="Noise type">
          <option value="">Any noise type</option>
          {(Object.keys(NOISE_LABELS) as NoiseTag[]).map((x) => (
            <option key={x} value={x}>
              {NOISE_LABELS[x]}
            </option>
          ))}
        </Select>
        <Select value={intent} onChange={(e) => setIntent(e.target.value)} aria-label="Intent">
          <option value="">Any intent</option>
          {Object.entries(INTENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-1.5">
          {list.map((x) => (
            <button
              key={x.id}
              onClick={() => setSelId(x.id)}
              className={cn("w-full cursor-pointer rounded-lg border bg-card p-3 text-left hover:bg-muted", x.id === c.id && "border-primary ring-1 ring-primary")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">{x.id}</span>
                <Badge variant={x.gold.intent === "interested" ? "success" : x.gold.intent === "not_interested" ? "danger" : "warning"}>{INTENT_LABEL[x.gold.intent]}</Badge>
              </div>
              <div className="mt-1 text-sm font-medium">{x.title}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {x.language} · {x.quality} · {x.agent} · {x.callType}
              </div>
            </button>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground">No conversations match these filters.</p>}
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{c.title}</CardTitle>
              <div className="flex flex-wrap gap-3">
                <Switch checked={showGold} onChange={setShowGold} label={<span className="text-xs">Show gold annotations</span>} />
                <Switch checked={useAsr} onChange={setUseAsr} label={<span className="text-xs">Show raw diarization labels</span>} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="muted">{c.language}</Badge>
              <Badge variant="muted">{c.quality}</Badge>
              <Badge variant="muted">{c.agent}</Badge>
              <Badge variant="muted">{c.callType}</Badge>
              <Badge variant="muted">{Math.round(c.durationSec / 60)}m {c.durationSec % 60}s</Badge>
              <Badge variant="muted">segment: {c.segment}</Badge>
              {c.noise.map((n) => (
                <Badge key={n} variant="warning">
                  {NOISE_LABELS[n]}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5 rounded-lg border bg-subtle p-3">
              {c.turns.map((t, i) => {
                const shown = useAsr && t.asrSpeaker ? t.asrSpeaker : t.speaker;
                const isEvidence = showGold && c.gold.evidenceTurns.includes(i);
                return (
                  <div key={i} className={cn("flex flex-wrap items-start gap-2 rounded-md px-2 py-1.5 font-mono text-[13px]", isEvidence && "bg-success-soft ring-1 ring-success/50")}>
                    <span className="w-5 pt-0.5 text-right text-[11px] text-muted-foreground">{i + 1}</span>
                    <SpeakerTag speaker={shown} />
                    <span className="min-w-0 flex-1">{showGold ? highlight(t.text, t.entities) : t.text}</span>
                    {showGold && (
                      <span className="flex gap-1">
                        <Badge variant="info" className="text-[10px]">
                          {t.act}
                        </Badge>
                        <Badge variant="muted" className="text-[10px]">
                          {t.segment}
                        </Badge>
                      </span>
                    )}
                    {t.asrSpeaker && t.asrSpeaker !== t.speaker && (
                      <span className="flex basis-full items-center gap-1 pl-7 text-[11px] text-danger">
                        <AlertTriangle className="h-3 w-3" /> Diarization labelled this turn “{t.asrSpeaker}”; it was actually the {t.speaker}.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {showGold && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gold output</div>
                  <pre className="overflow-auto font-mono text-xs">
                    {JSON.stringify(
                      {
                        intent: c.gold.intent,
                        product: c.gold.product,
                        amount: c.gold.amount,
                        tenure_months: c.gold.tenureMonths,
                        rate: c.gold.rate,
                        employment: c.gold.employment,
                        evidence_turns: c.gold.evidenceTurns.map((t) => t + 1),
                        objections: c.gold.objections,
                        needs_review: c.gold.needsReview,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Annotator notes</div>
                  {c.gold.notes}
                  {c.gold.amount && <div className="mt-2 text-xs text-muted-foreground">Amount normalized: ₹{formatNumber(c.gold.amount)}</div>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
