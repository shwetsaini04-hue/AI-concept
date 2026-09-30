"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { cohenKappa, fleissKappa, kappaBand, krippendorffAlphaNominal, type Label } from "@/lib/metrics/agreement";
import { confusion } from "@/lib/metrics/classification";
import { cn, pct, rng } from "@/lib/utils";

const CATS = ["INT", "NOT", "INS"] as const;
const CAT_NAME: Record<string, string> = { INT: "Interested", NOT: "Not interested", INS: "Insufficient" };
const CAT_CLS: Record<string, string> = {
  INT: "bg-success-soft text-success",
  NOT: "bg-danger-soft text-danger",
  INS: "bg-warning-soft text-warning",
};

const UTTERANCES = [
  "haan bhej do, main apply kar dunga",
  "abhi nahi chahiye",
  "I might consider it next month",
  "rate kam karo toh sochunga",
  "process start kar do",
  "mere bhai ko chahiye tha",
  "not interested, don't call again",
  "documents kya lagenge?",
  "theek hai, link bhejo",
  "wah 18%, zaroor lunga… mazaak tha",
  "haan… dekhte hai",
  "EMI zyada hai… ok 5 saal kar do",
  "wrong number",
  "sochke batata hu",
  "I want to apply today",
  "shaam ko call karo",
  "already dusre bank se le liya",
  "kitna milega max?",
  "yes please proceed",
  "papa se puchna padega",
];

type Row = [Label, Label, Label];

const REALISTIC: Row[] = [
  ["INT", "INT", "INT"], ["NOT", "NOT", "NOT"], ["INS", "INS", "INT"], ["INS", "NOT", "INS"], ["INT", "INT", "INT"],
  ["NOT", "INS", "NOT"], ["NOT", "NOT", "NOT"], ["INT", "INS", "INS"], ["INT", "INT", "INT"], ["NOT", "INT", "NOT"],
  ["INS", "INS", "INS"], ["INT", "NOT", "INT"], ["INS", "INS", null], ["INS", "INS", "INS"], ["INT", "INT", "INT"],
  ["INS", "INS", "INS"], ["NOT", "NOT", "NOT"], ["INS", "INT", "INS"], ["INT", "INT", "INT"], ["INS", "INS", null],
];

function paradox(): Row[] {
  return UTTERANCES.map((_, i) => [[2, 6].includes(i) ? "NOT" : "INT", [11, 14].includes(i) ? "NOT" : "INT", i % 7 === 0 ? "NOT" : "INT"] as Row);
}

function random(seed: number): Row[] {
  const r = rng(seed);
  const pick = () => CATS[Math.floor(r() * 3)];
  return UTTERANCES.map(() => [pick(), pick(), pick()] as Row);
}

export default function AgreementLab() {
  const [rows, setRows] = useState<Row[]>(REALISTIC);
  const [seed, setSeed] = useState(3);

  const A = rows.map((r) => r[0]);
  const B = rows.map((r) => r[1]);
  const cats = [...CATS] as string[];
  const cohen = useMemo(() => cohenKappa(A, B, cats), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const fleiss = useMemo(() => fleissKappa(rows, cats), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const alpha = useMemo(() => krippendorffAlphaNominal(rows), [rows]);
  const cm = useMemo(
    () =>
      confusion(
        cats,
        A.filter((a, i) => a && B[i]).map(String),
        B.filter((b, i) => b && A[i]).map(String),
      ),
    [rows], // eslint-disable-line react-hooks/exhaustive-deps
  );

  function cycle(i: number, j: 0 | 1 | 2) {
    const order: Label[] = j === 2 ? ["INT", "NOT", "INS", null] : ["INT", "NOT", "INS"];
    setRows((rs) =>
      rs.map((r, k) => {
        if (k !== i) return r;
        const n = [...r] as Row;
        n[j] = order[(order.indexOf(r[j]) + 1) % order.length];
        return n;
      }),
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Three annotators, twenty utterances</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Click any label to change it. Annotator C can also skip an item (—), which only Krippendorff's α handles.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ModeBadge mode="computed" />
            <Button size="sm" variant="outline" onClick={() => setRows(REALISTIC)}>
              Realistic
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRows(paradox())}>
              Majority-class paradox
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSeed((s) => s + 1);
                setRows(random(seed + 1));
              }}
            >
              Random labels
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRows(rows.map((r) => [r[0], r[0], r[0]] as Row))}>
              Perfect agreement
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Utterance</th>
                  <th className="py-1 pr-1 text-center">A</th>
                  <th className="py-1 pr-1 text-center">B</th>
                  <th className="py-1 pr-1 text-center">C</th>
                  <th className="py-1 text-center">A=B</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1 pr-2 font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td className="py-1 pr-2 font-mono text-xs">{UTTERANCES[i]}</td>
                    {[0, 1, 2].map((j) => (
                      <td key={j} className="py-1 pr-1 text-center">
                        <button onClick={() => cycle(i, j as 0 | 1 | 2)} className={cn("w-12 cursor-pointer rounded px-1 py-0.5 font-mono text-[11px] font-semibold", r[j] ? CAT_CLS[r[j]!] : "bg-muted text-muted-foreground")}>
                          {r[j] ?? "—"}
                        </button>
                      </td>
                    ))}
                    <td className="py-1 text-center">{r[0] === r[1] ? <span className="text-success">✓</span> : <span className="text-danger">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              {CATS.map((c) => (
                <span key={c} className={cn("rounded px-1.5 py-0.5", CAT_CLS[c])}>
                  {c} = {CAT_NAME[c]}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-semibold">Cohen's κ (A vs B)</div>
              <Bar label="Observed agreement pₒ" v={cohen.observed} cls="bg-primary" />
              <Bar label="Chance agreement pₑ" v={cohen.expected} cls="bg-muted-foreground/50" />
              <div className="mt-2 font-mono text-xs text-muted-foreground">
                κ = (pₒ − pₑ) / (1 − pₑ) = ({cohen.observed.toFixed(2)} − {cohen.expected.toFixed(2)}) / (1 − {cohen.expected.toFixed(2)})
              </div>
              <div className="mt-1 text-2xl font-semibold">
                κ = {cohen.kappa.toFixed(3)} <span className="text-sm font-normal text-muted-foreground">({kappaBand(cohen.kappa)})</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px]">
                {CATS.map((c) => (
                  <div key={c} className="rounded bg-muted p-1">
                    {c}: A {cohen.marginalsA[c] ?? 0} · B {cohen.marginalsB[c] ?? 0}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Fleiss' κ (A, B, C)</div>
                <div className="text-xl font-semibold">{fleiss.kappa.toFixed(3)}</div>
                <div className="text-[11px] text-muted-foreground">{fleiss.n} complete items only</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Krippendorff's α (nominal)</div>
                <div className="text-xl font-semibold">{alpha.alpha.toFixed(3)}</div>
                <div className="text-[11px] text-muted-foreground">uses all items, incl. missing</div>
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">Confusion: A (rows) vs B (columns)</div>
              <table className="w-full text-center font-mono text-xs">
                <thead>
                  <tr>
                    <th />
                    {CATS.map((c) => (
                      <th key={c} className="py-1">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cm.map((row, i) => (
                    <tr key={i}>
                      <th className="py-1">{CATS[i]}</th>
                      {row.map((v, j) => (
                        <td key={j} className={cn("rounded py-1", i === j ? "bg-success-soft" : v ? "bg-danger-soft" : "")}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-muted-foreground">Off-diagonal cells show <i>which</i> boundary is ambiguous — that's what the codebook must fix.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Callout tone="info" title="Raw agreement ≠ agreement beyond chance">
        Click <b>Majority-class paradox</b>: both annotators say “Interested” for almost everything, raw agreement is {" "}
        <Badge variant="muted">high</Badge>, yet κ is near or below zero — because two people guessing with those label frequencies would agree that often anyway. κ asks: how much better than chance are we?
      </Callout>
    </div>
  );
}

function Bar({ label, v, cls }: { label: string; v: number; cls: string }) {
  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{pct(v, 1)}</span>
      </div>
      <div className="h-2.5 rounded bg-muted">
        <div className={cn("h-full rounded", cls)} style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  );
}
