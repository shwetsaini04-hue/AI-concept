"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Switch, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { ENTITY_TYPES, type EntityType } from "@/content/dataset";
import { spanScores, type Span } from "@/lib/metrics/classification";
import { cn, pct } from "@/lib/utils";
import { ENTITY_COLOR } from "@/components/shared/entityColors";



interface Sentence {
  text: string;
  gold: { text: string; type: EntityType }[];
}

const SENTENCES: Sentence[] = [
  {
    text: "Sir I need a personal loan of 5 lakh at around 10.5 percent for 5 years.",
    gold: [
      { text: "personal loan", type: "LOAN" },
      { text: "5 lakh", type: "AMOUNT" },
      { text: "10.5 percent", type: "RATE" },
      { text: "5 years", type: "TENURE" },
    ],
  },
  {
    text: "mera naam Rahul Verma hai, main Pune mein salaried hu",
    gold: [
      { text: "Rahul Verma", type: "PERSON" },
      { text: "Pune", type: "LOCATION" },
      { text: "salaried", type: "EMPLOYMENT" },
    ],
  },
  {
    text: "Metro Finance wale 11 percent de rahe the, aap kitna doge?",
    gold: [
      { text: "Metro Finance", type: "BANK" },
      { text: "11 percent", type: "RATE" },
    ],
  },
  {
    text: "mujhe home lon chahiye pachas lakh ka, next month tak",
    gold: [
      { text: "home lon", type: "LOAN" },
      { text: "pachas lakh", type: "AMOUNT" },
      { text: "next month", type: "DATE" },
    ],
  },
  {
    text: "apna business hai, credit card bhi chahiye aur 3 saal ka tenure",
    gold: [
      { text: "apna business", type: "EMPLOYMENT" },
      { text: "credit card", type: "PRODUCT" },
      { text: "3 saal", type: "TENURE" },
    ],
  },
  {
    text: "Sunrise Bank se Neha bol rahi hu, aapka 2 lakh ka top-up approve hai",
    gold: [
      { text: "Sunrise Bank", type: "BANK" },
      { text: "Neha", type: "PERSON" },
      { text: "2 lakh", type: "AMOUNT" },
      { text: "top-up", type: "PRODUCT" },
    ],
  },
];

interface Tok {
  text: string;
  start: number;
  end: number;
}

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  const re = /[\p{L}\p{N}]+(?:[.'-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

const goldSpans = (s: Sentence): Span[] =>
  s.gold.map((g) => {
    const start = s.text.indexOf(g.text);
    return { start, end: start + g.text.length, type: g.type };
  });

/** Transparent rule-based NER baseline: regex + gazetteers. */
function ruleNer(text: string): Span[] {
  const spans: Span[] = [];
  const add = (re: RegExp, type: EntityType, group = 0) => {
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    while ((m = r.exec(text))) {
      const t = m[group];
      const start = m.index + m[0].indexOf(t);
      if (!spans.some((s) => s.start < start + t.length && start < s.end)) spans.push({ start, end: start + t.length, type });
    }
  };
  add(/\b\d+(?:\.\d+)?\s*(?:percent|%)/i, "RATE");
  add(/\b(?:\d+(?:\.\d+)?|five|pachas|das|ek|do|teen)\s+(?:lakh|lac|crore|hazaar)\b/i, "AMOUNT");
  add(/\b(?:\d+|five|teen|do)\s+(?:years?|saal)\b/i, "TENURE");
  add(/\b(?:personal|home|car|gold|vehicle)\s+loan\b|\bPL\b/i, "LOAN");
  add(/Sunrise Bank|Metro Finance/, "BANK");
  add(/\b(?:Pune|Noida|Mumbai|Delhi)\b/, "LOCATION");
  add(/\b(?:salaried|self[- ]employed)\b/i, "EMPLOYMENT");
  add(/\b(?:credit card|top-up|top up)\b/i, "PRODUCT");
  add(/\b(?:next month|next week|kal|tomorrow)\b/i, "DATE");
  add(/\b(?:naam|name is|se)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/, "PERSON", 1);
  return spans.sort((a, b) => a.start - b.start);
}

function classify(pred: Span, gold: Span[]) {
  const exact = gold.find((g) => g.start === pred.start && g.end === pred.end);
  if (exact) return exact.type === pred.type ? "exact" : "type";
  const ov = gold.find((g) => g.start < pred.end && pred.start < g.end);
  if (ov) return ov.type === pred.type ? "boundary" : "type";
  return "spurious";
}

export default function NerLab() {
  const [idx, setIdx] = useState(0);
  const [ann, setAnn] = useState<Record<number, Span[]>>({});
  const [anchor, setAnchor] = useState<number | null>(null);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [showGold, setShowGold] = useState(false);
  const [showRule, setShowRule] = useState(false);

  const s = SENTENCES[idx];
  const toks = useMemo(() => tokenize(s.text), [s]);
  const gold = useMemo(() => goldSpans(s), [s]);
  const mine = ann[idx] ?? [];
  const rules = useMemo(() => ruleNer(s.text), [s]);

  const scores = spanScores(gold, mine);
  const ruleScores = spanScores(gold, rules);

  const allGold = SENTENCES.flatMap((x, i) => goldSpans(x).map((g) => ({ ...g, start: g.start + i * 10000, end: g.end + i * 10000 })));
  const allRule = SENTENCES.flatMap((x, i) => ruleNer(x.text).map((g) => ({ ...g, start: g.start + i * 10000, end: g.end + i * 10000 })));
  const ruleAll = spanScores(allGold, allRule);

  function clickTok(i: number) {
    if (anchor === null) {
      setAnchor(i);
      setSel([i, i]);
    } else {
      const a = Math.min(anchor, i);
      const b = Math.max(anchor, i);
      setSel([a, b]);
      setAnchor(null);
    }
  }

  function assign(type: EntityType) {
    if (!sel) return;
    const span: Span = { start: toks[sel[0]].start, end: toks[sel[1]].end, type };
    const rest = mine.filter((m) => !(m.start < span.end && span.start < m.end));
    setAnn((x) => ({ ...x, [idx]: [...rest, span].sort((p, q) => p.start - q.start) }));
    setSel(null);
    setAnchor(null);
  }

  const spanAt = (spans: Span[], t: Tok) => spans.find((sp) => sp.start <= t.start && t.end <= sp.end);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Annotate entities</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Click the first word, then the last word of an entity, then pick its type. Click a labelled span's ✕ below to remove it.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} aria-label="Previous sentence">
              <ChevronLeft />
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              {idx + 1} / {SENTENCES.length}
            </span>
            <Button size="icon" variant="outline" onClick={() => setIdx((i) => Math.min(SENTENCES.length - 1, i + 1))} disabled={idx === SENTENCES.length - 1} aria-label="Next sentence">
              <ChevronRight />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-subtle p-4 font-mono text-[15px] leading-10">
            {toks.map((t, i) => {
              const m = spanAt(mine, t);
              const inSel = sel && i >= sel[0] && i <= sel[1];
              return (
                <button
                  key={i}
                  onClick={() => clickTok(i)}
                  className={cn(
                    "mr-1 cursor-pointer rounded px-1 py-0.5 ring-1 ring-transparent transition-colors hover:bg-muted",
                    m && ENTITY_COLOR[m.type as EntityType],
                    inSel && "ring-2 ring-primary",
                  )}
                  title={m ? m.type : "click to select"}
                >
                  {t.text}
                  {m && m.end === t.end && <sup className="ml-0.5 text-[9px] font-bold">{m.type}</sup>}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ENTITY_TYPES.map((t) => (
              <button
                key={t}
                disabled={!sel}
                onClick={() => assign(t)}
                className={cn("rounded-md px-2 py-1 text-xs font-semibold ring-1 disabled:cursor-not-allowed disabled:opacity-40", ENTITY_COLOR[t], sel && "cursor-pointer")}
              >
                {t}
              </button>
            ))}
          </div>
          {mine.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mine.map((m, i) => (
                <span key={i} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1", ENTITY_COLOR[m.type as EntityType])}>
                  {s.text.slice(m.start, m.end)} · {m.type}
                  <button className="cursor-pointer" onClick={() => setAnn((x) => ({ ...x, [idx]: mine.filter((_, j) => j !== i) }))} aria-label="Remove">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <Switch checked={showGold} onChange={setShowGold} label={<span className="text-sm">Compare with reference</span>} />
            <Switch checked={showRule} onChange={setShowRule} label={<span className="text-sm">Show rule-based baseline</span>} />
          </div>

          {showGold && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <ModeBadge mode="precomputed" detail="Reference annotation" />
                <Badge variant="muted">Strict F1 {scores.strict.f1.toFixed(2)}</Badge>
                <Badge variant="muted">Partial F1 {scores.partial.f1.toFixed(2)}</Badge>
              </div>
              <div className="font-mono text-sm leading-9">
                {gold.map((g, i) => (
                  <span key={i} className={cn("mr-2 rounded px-1.5 py-0.5 ring-1", ENTITY_COLOR[g.type as EntityType])}>
                    {s.text.slice(g.start, g.end)} <sup className="text-[9px] font-bold">{g.type}</sup>
                  </span>
                ))}
              </div>
              <ul className="space-y-1 text-sm">
                {mine.map((m, i) => {
                  const c = classify(m, gold);
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <Badge variant={c === "exact" ? "success" : c === "boundary" ? "warning" : "danger"}>{c === "exact" ? "exact match" : c === "boundary" ? "boundary mismatch" : c === "type" ? "wrong type" : "spurious"}</Badge>
                      <span className="font-mono text-xs">
                        “{s.text.slice(m.start, m.end)}” as {m.type}
                      </span>
                    </li>
                  );
                })}
                {gold
                  .filter((g) => !mine.some((m) => m.start < g.end && g.start < m.end))
                  .map((g, i) => (
                    <li key={`miss${i}`} className="flex items-center gap-2">
                      <Badge variant="warning">missed</Badge>
                      <span className="font-mono text-xs">
                        “{s.text.slice(g.start, g.end)}” ({g.type})
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {showRule && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <ModeBadge mode="computed" detail="Regexes + gazetteers (deterministic code), not a model." />
                <Badge variant="muted">This sentence: strict F1 {ruleScores.strict.f1.toFixed(2)}</Badge>
                <Badge variant="muted">
                  All {SENTENCES.length} sentences: P {pct(ruleAll.strict.precision)} · R {pct(ruleAll.strict.recall)}
                </Badge>
              </div>
              <div className="font-mono text-sm leading-9">
                {rules.length === 0 && <span className="text-muted-foreground">No entities found.</span>}
                {rules.map((g, i) => (
                  <span key={i} className={cn("mr-2 rounded px-1.5 py-0.5 ring-1", ENTITY_COLOR[g.type as EntityType])}>
                    {s.text.slice(g.start, g.end)} <sup className="text-[9px] font-bold">{g.type}</sup>
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Rules are precise on clean patterns (“5 lakh”, “10.5 percent”) but miss noisy or paraphrased mentions (“home lon”, “apna business”). Precision-high/recall-low is the classic rule-based profile.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Callout tone="info" title="Strict vs partial matching">
        If you labelled “around 10.5 percent” while the reference says “10.5 percent”, strict matching counts it as <b>both</b> a false positive and a false negative, while partial matching credits the overlap.
        Choose the matching rule that reflects your downstream use: a rate parser needs the number, not the exact boundary.
      </Callout>
    </div>
  );
}
