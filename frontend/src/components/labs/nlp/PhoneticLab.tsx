"use client";

import { useMemo, useState } from "react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { metaphone, soundex, soundexSteps } from "@/lib/nlp/phonetic";
import { levenshteinDistance } from "@/lib/nlp/fuzzy";
import { binaryMetrics } from "@/lib/metrics/classification";
import { cn, pct } from "@/lib/utils";

/** Gold set: each spelling belongs to a real-world entity id. */
const GOLD: { name: string; entity: string }[] = [
  { name: "Rahul", entity: "rahul" },
  { name: "Raahul", entity: "rahul" },
  { name: "Rahool", entity: "rahul" },
  { name: "Mohammed", entity: "mohammed" },
  { name: "Mohammad", entity: "mohammed" },
  { name: "Muhammad", entity: "mohammed" },
  { name: "Mohamed", entity: "mohammed" },
  { name: "Lakshmi", entity: "lakshmi" },
  { name: "Laxmi", entity: "lakshmi" },
  { name: "Chaudhary", entity: "chaudhary" },
  { name: "Choudhury", entity: "chaudhary" },
  { name: "Chowdhury", entity: "chaudhary" },
  { name: "Srinivas", entity: "srinivas" },
  { name: "Shrinivas", entity: "srinivas" },
  { name: "Sreenivas", entity: "srinivas" },
  { name: "Priya", entity: "priya" },
  { name: "Pria", entity: "priya" },
  { name: "Preeti", entity: "preeti" },
  { name: "Priti", entity: "preeti" },
  { name: "Kumar", entity: "kumar" },
  { name: "Kumari", entity: "kumari" },
  { name: "Singh", entity: "singh" },
  { name: "Sinha", entity: "sinha" },
  { name: "Sharma", entity: "sharma" },
  { name: "Verma", entity: "verma" },
];

const WORD_GROUPS = [
  ["Rahul", "Raahul", "Rahool"],
  ["loan", "lone", "lawn", "alone"],
  ["Kumar", "Kumari"],
  ["EMI", "Amy", "Emmy"],
  ["Sharma", "Verma", "Sarma"],
  ["राहुल", "Rahul"],
];

type Method = "soundex" | "metaphone" | "lev1" | "either";
const METHOD_LABEL: Record<Method, string> = {
  soundex: "Same Soundex code",
  metaphone: "Same Metaphone key",
  lev1: "Edit distance ≤ 1",
  either: "Same Metaphone OR edit distance ≤ 1",
};

function sameBy(method: Method, a: string, b: string) {
  switch (method) {
    case "soundex":
      return soundex(a) === soundex(b);
    case "metaphone":
      return metaphone(a) === metaphone(b);
    case "lev1":
      return levenshteinDistance(a.toLowerCase(), b.toLowerCase()) <= 1;
    case "either":
      return metaphone(a) === metaphone(b) || levenshteinDistance(a.toLowerCase(), b.toLowerCase()) <= 1;
  }
}

export default function PhoneticLab() {
  const [words, setWords] = useState(WORD_GROUPS[0].join(", "));
  const [inspect, setInspect] = useState("Chaudhary");
  const list = words.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);

  const groups = useMemo(() => {
    const by: Record<string, string[]> = {};
    for (const w of list) {
      const k = soundex(w) || "(no code)";
      (by[k] ??= []).push(w);
    }
    return by;
  }, [list]);

  const evals = useMemo(() => {
    const methods: Method[] = ["soundex", "metaphone", "lev1", "either"];
    return methods.map((method) => {
      let tp = 0, fp = 0, fn = 0, tn = 0;
      const fps: string[] = [];
      const fns: string[] = [];
      for (let i = 0; i < GOLD.length; i++) {
        for (let j = i + 1; j < GOLD.length; j++) {
          const pred = sameBy(method, GOLD[i].name, GOLD[j].name);
          const gold = GOLD[i].entity === GOLD[j].entity;
          if (pred && gold) tp++;
          else if (pred) {
            fp++;
            fps.push(`${GOLD[i].name}~${GOLD[j].name}`);
          } else if (gold) {
            fn++;
            fns.push(`${GOLD[i].name}~${GOLD[j].name}`);
          } else tn++;
        }
      }
      return { method, ...binaryMetrics({ tp, fp, fn, tn }), fps, fns };
    });
  }, []);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Encode words by sound</CardTitle>
          <ModeBadge mode="computed" detail="American Soundex and original Metaphone, implemented from their published rules." />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {WORD_GROUPS.map((g) => (
              <button key={g.join()} onClick={() => setWords(g.join(", "))} className="cursor-pointer rounded-md border px-2 py-1 font-mono text-xs hover:bg-muted">
                {g.join(" / ")}
              </button>
            ))}
          </div>
          <Input value={words} onChange={(e) => setWords(e.target.value)} className="font-mono" aria-label="Comma-separated words" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">Word</th>
                  <th className="py-1 pr-3">Soundex</th>
                  <th className="py-1 pr-3">Metaphone</th>
                </tr>
              </thead>
              <tbody>
                {list.map((w, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1.5 pr-3 font-mono">{w}</td>
                    <td className="py-1.5 pr-3 font-mono">{soundex(w) || <span className="text-danger">— (no Latin letters)</span>}</td>
                    <td className="py-1.5 pr-3 font-mono">{metaphone(w) || <span className="text-danger">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(groups).map(([code, ws]) => (
              <div key={code} className={cn("rounded-md border px-3 py-2 text-sm", ws.length > 1 && "border-primary/40 bg-primary-soft")}>
                <span className="font-mono font-semibold">{code}</span>: {ws.join(", ")}
              </div>
            ))}
          </div>
          {list.some((w) => /[^\x00-\x7F]/.test(w)) && (
            <Callout tone="warning">Non-Latin script detected. Soundex and Metaphone only understand Latin letters — transliterate first, or use a script-aware phonetic scheme.</Callout>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Show your work: Soundex step by step</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="insp">Word</Label>
            <Input id="insp" value={inspect} onChange={(e) => setInspect(e.target.value)} className="max-w-[220px] font-mono" />
            <Badge>{soundex(inspect) || "—"}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {soundexSteps(inspect).map((s, i) => (
              <div key={i} className={cn("rounded-md border px-2 py-1 text-center text-xs", s.code ? "border-primary/40 bg-primary-soft" : "opacity-70")}>
                <div className="font-mono text-base font-semibold">{s.char}</div>
                <div className="text-[10px] text-muted-foreground">{s.action}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Codes: B F P V → 1 · C G J K Q S X Z → 2 · D T → 3 · L → 4 · M N → 5 · R → 6. Pad/truncate to 4 characters.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Does “sounds the same” mean “same person”?</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {GOLD.length} spellings of {new Set(GOLD.map((g) => g.entity)).size} real names. Every pair is scored: do the methods merge the right pairs?
            </p>
          </div>
          <ModeBadge mode="computed" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">Rule for “same entity”</th>
                  <th className="py-1 pr-3 text-right">Precision</th>
                  <th className="py-1 pr-3 text-right">Recall</th>
                  <th className="py-1 pr-3">False merges (FP)</th>
                  <th className="py-1">Missed merges (FN)</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((e) => (
                  <tr key={e.method} className="border-t align-top">
                    <td className="py-2 pr-3 font-medium">{METHOD_LABEL[e.method]}</td>
                    <td className="py-2 pr-3 text-right font-mono">{pct(e.precision)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{pct(e.recall)}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-danger">{e.fps.join(", ") || "—"}</td>
                    <td className="py-2 font-mono text-xs text-warning">{e.fns.slice(0, 6).join(", ") || "—"}{e.fns.length > 6 ? ` (+${e.fns.length - 6})` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout tone="info" title="What to notice">
            Phonetic keys have high recall for transliteration variants but merge different people whose names sound alike (Kumar/Kumari).
            Edit distance catches small typos but misses long variants (Chaudhary/Chowdhury). Combining signals changes the trade-off — and you
            only know which is better by measuring on labelled pairs like these.
          </Callout>
        </CardContent>
      </Card>
    </div>
  );
}
