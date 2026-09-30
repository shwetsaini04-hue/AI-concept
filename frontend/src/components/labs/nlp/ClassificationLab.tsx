"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { similarity } from "@/lib/nlp/fuzzy";
import { useLabState } from "@/lib/store/progress";
import { cn, pct } from "@/lib/utils";

const SNIPPETS = [
  { text: "haan bhej do, main kal tak apply kar dunga", mc: "Interested", ml: ["Interested", "High Intent"] },
  { text: "mera already PL chal raha hai, top up mil sakta hai kya", mc: "Interested", ml: ["Interested", "Existing Customer"] },
  { text: "14 percent bahut zyada hai, not interested", mc: "Not Interested", ml: [] },
  { text: "abhi drive kar raha hu, shaam ko 6 baje call karo", mc: "Unknown", ml: ["Needs Follow-up"] },
  { text: "I might consider a loan next month.", mc: "Unknown", ml: ["Needs Follow-up"] },
  { text: "mujhe nahi chahiye, par mere bhai ko chahiye tha shayad", mc: "Not Interested", ml: ["Needs Follow-up"] },
  { text: "apna business hai, 50 lakh ka home loan chahiye", mc: "Interested", ml: ["Interested", "High Intent"] },
  { text: "nahi, wrong number hai", mc: "Unknown", ml: [] },
];

const MC_LABELS = ["Interested", "Not Interested", "Unknown"];
const ML_LABELS = ["Interested", "Existing Customer", "High Intent", "Needs Follow-up"];

/* --------- taxonomy designer lint --------- */

const DIMENSIONS: { dim: string; re: RegExp }[] = [
  { dim: "intent", re: /interest|intent|refus|maybe|unknown|insufficient|not interested|undecided/i },
  { dim: "customer status", re: /existing|new customer|repeat|customer/i },
  { dim: "product", re: /personal|home|vehicle|car|credit|card|loan|top.?up|gold/i },
  { dim: "action", re: /follow|callback|call back|review|escalat/i },
  { dim: "objection", re: /rate|emi|document|eligib|timing|price|expensive/i },
  { dim: "contact outcome", re: /wrong number|not reachable|busy|dnd|do not call/i },
];

const dimsOf = (label: string) => DIMENSIONS.filter((d) => d.re.test(label)).map((d) => d.dim);

type Mode = "multi-class" | "multi-label" | "hierarchical";

interface LintItem {
  level: "error" | "warning" | "ok";
  text: string;
}

function lint(mode: Mode, labels: string[], assignments: string[][], noFit: boolean[]): LintItem[] {
  const out: LintItem[] = [];
  const leafs = mode === "hierarchical" ? labels.map((l) => l.split(">").map((x) => x.trim())) : labels.map((l) => [l]);
  const flat = leafs.map((p) => p.join(" > "));
  if (!labels.length) return [{ level: "error", text: "No labels defined yet." }];

  const hasAbstain = labels.some((l) => /unknown|insufficient|unclear|other|not enough/i.test(l));
  out.push(
    hasAbstain
      ? { level: "ok", text: "Has an abstain/insufficient-evidence option." }
      : { level: "error", text: "No abstain label (Unknown / Insufficient evidence). Annotators and models will be forced to guess on ambiguous calls." },
  );

  if (mode === "multi-class") {
    const dims = new Set(labels.flatMap(dimsOf));
    if (dims.size > 1)
      out.push({
        level: "error",
        text: `Multi-class labels must be mutually exclusive, but your labels mix dimensions (${[...dims].join(", ")}). A call can be both “existing customer” and “interested” — which one wins?`,
      });
    else out.push({ level: "ok", text: "Labels appear to be on a single dimension (can be mutually exclusive)." });
  }
  if (mode === "multi-label") {
    const dims = new Set(labels.flatMap(dimsOf));
    if (dims.size > 2)
      out.push({ level: "warning", text: `Multi-label list spans ${dims.size} dimensions (${[...dims].join(", ")}). Consider separate fields per dimension — each is easier to define and evaluate.` });
  }
  if (mode === "hierarchical") {
    const depths = leafs.map((p) => p.length);
    if (Math.max(...depths) > 3) out.push({ level: "warning", text: "Depth > 3 levels. Deep trees get sparse: few examples per leaf, low agreement at the bottom." });
    const parents = new Map<string, Set<string>>();
    leafs.forEach((p) => p.slice(0, -1).forEach((_, i) => {
      const parent = p.slice(0, i + 1).join(">");
      if (!parents.has(parent)) parents.set(parent, new Set());
      parents.get(parent)!.add(p[i + 1]);
    }));
    for (const [parent, kids] of parents) if (kids.size === 1) out.push({ level: "warning", text: `“${parent}” has a single child — the level adds no information.` });
    const levelDims = new Set<string>();
    leafs.forEach((p) => p.forEach((node, depth) => dimsOf(node).forEach((d) => levelDims.add(`${depth}:${d}`))));
    const byDepth: Record<string, Set<string>> = {};
    [...levelDims].forEach((x) => {
      const [dp, dm] = x.split(":");
      (byDepth[dp] ??= new Set()).add(dm);
    });
    for (const [dp, ds] of Object.entries(byDepth)) if (ds.size > 1) out.push({ level: "warning", text: `Level ${Number(dp) + 1} mixes dimensions (${[...ds].join(", ")}). Siblings should answer the same question.` });
  }

  for (let i = 0; i < flat.length; i++)
    for (let j = i + 1; j < flat.length; j++)
      if (similarity("levenshtein", flat[i], flat[j]) > 0.8) out.push({ level: "warning", text: `“${flat[i]}” and “${flat[j]}” are nearly identical — annotators will split between them.` });

  const used = new Set(assignments.flat());
  const labelledCount = assignments.filter((a) => a.length).length + noFit.filter(Boolean).length;
  if (labelledCount > 0) {
    const unused = flat.filter((l) => !used.has(l));
    if (unused.length) out.push({ level: "warning", text: `Never used on the stress-test snippets: ${unused.join(", ")}. Needed, or speculative?` });
    const gaps = noFit.filter(Boolean).length;
    if (gaps) out.push({ level: "error", text: `${gaps} snippet(s) fit none of your labels — a coverage gap. Every real call must have a valid label.` });
    if (mode === "multi-class") {
      const forced = SNIPPETS.filter((s) => s.ml.length > 1).length;
      out.push({ level: "warning", text: `${forced} snippets carry more than one fact (e.g. existing customer AND interested). Multi-class forces you to drop information on these.` });
    }
  }
  return out;
}

const PRESETS: Record<string, { mode: Mode; labels: string }> = {
  "Bad: mixed dimensions": { mode: "multi-class", labels: "Interested\nExisting Customer\nNot Interested\nCallback\nPersonal Loan" },
  "Clean intent (multi-class)": { mode: "multi-class", labels: "Interested\nNot Interested\nInsufficient Evidence" },
  "Hierarchical: product > intent": {
    mode: "hierarchical",
    labels: "Loan > Personal Loan > Interested\nLoan > Personal Loan > Not Interested\nLoan > Home Loan > Interested\nLoan > Home Loan > Not Interested\nLoan > Vehicle Loan\nLoan > Unspecified\nNo product > Insufficient Evidence",
  },
};

export default function ClassificationLab() {
  // Tab 1+2
  const [mc, setMc] = useState<string[]>(SNIPPETS.map(() => ""));
  const [ml, setMl] = useState<string[][]>(SNIPPETS.map(() => []));
  const [checked, setChecked] = useState(false);

  // Tab 3 (persisted design)
  const [design, setDesign] = useLabState("classification-design", { mode: "multi-class" as Mode, labels: PRESETS["Bad: mixed dimensions"].labels });
  const [assign, setAssign] = useState<string[][]>(SNIPPETS.map(() => []));
  const [noFit, setNoFit] = useState<boolean[]>(SNIPPETS.map(() => false));
  const labels = design.labels.split("\n").map((l) => l.trim()).filter(Boolean);
  const flatLabels = design.mode === "hierarchical" ? labels.map((l) => l.split(">").map((x) => x.trim()).join(" > ")) : labels;
  const lints = useMemo(() => lint(design.mode, labels, assign, noFit), [design, labels, assign, noFit]);

  const mcAcc = mc.filter((x, i) => x === SNIPPETS[i].mc).length / SNIPPETS.length;
  const mlStats = useMemo(() => {
    let wrongDecisions = 0;
    let exact = 0;
    const perLabel = ML_LABELS.map((l) => {
      let tp = 0, fp = 0, fn = 0;
      SNIPPETS.forEach((s, i) => {
        const g = s.ml.includes(l);
        const p = ml[i].includes(l);
        if (g && p) tp++;
        else if (p) fp++;
        else if (g) fn++;
      });
      return { l, p: tp + fp ? tp / (tp + fp) : 0, r: tp + fn ? tp / (tp + fn) : 0 };
    });
    SNIPPETS.forEach((s, i) => {
      let allOk = true;
      ML_LABELS.forEach((l) => {
        if (s.ml.includes(l) !== ml[i].includes(l)) {
          wrongDecisions++;
          allOk = false;
        }
      });
      if (allOk) exact++;
    });
    return { hamming: wrongDecisions / (SNIPPETS.length * ML_LABELS.length), subset: exact / SNIPPETS.length, perLabel };
  }, [ml]);

  return (
    <Tabs defaultValue="compare">
      <TabsList>
        <TabsTrigger value="compare">Multi-class vs multi-label</TabsTrigger>
        <TabsTrigger value="design">Design your label structure</TabsTrigger>
      </TabsList>

      <TabsContent value="compare">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Label the same snippets two ways</CardTitle>
            <ModeBadge mode="precomputed" detail="Reference labels written for this lab; several are debatable on purpose." />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-2">Customer snippet</th>
                    <th className="py-1 pr-2">Multi-class (exactly one)</th>
                    <th className="py-1">Multi-label (any number)</th>
                  </tr>
                </thead>
                <tbody>
                  {SNIPPETS.map((s, i) => (
                    <tr key={i} className="border-t align-top">
                      <td className="py-2 pr-2 font-mono text-xs">{s.text}</td>
                      <td className="py-2 pr-2">
                        <Select
                          value={mc[i]}
                          onChange={(e) => {
                            const n = [...mc];
                            n[i] = e.target.value;
                            setMc(n);
                            setChecked(false);
                          }}
                          className={cn("w-40", checked && (mc[i] === s.mc ? "border-success" : "border-danger"))}
                          aria-label="Multi-class label"
                        >
                          <option value="">Choose…</option>
                          {MC_LABELS.map((l) => (
                            <option key={l}>{l}</option>
                          ))}
                        </Select>
                        {checked && mc[i] !== s.mc && <div className="mt-1 text-[11px] text-danger">ref: {s.mc}</div>}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {ML_LABELS.map((l) => {
                            const on = ml[i].includes(l);
                            const wrong = checked && on !== s.ml.includes(l);
                            return (
                              <button
                                key={l}
                                onClick={() => {
                                  const n = ml.map((x) => [...x]);
                                  n[i] = on ? n[i].filter((x) => x !== l) : [...n[i], l];
                                  setMl(n);
                                  setChecked(false);
                                }}
                                className={cn(
                                  "cursor-pointer rounded border px-1.5 py-0.5 text-[11px]",
                                  on ? "border-primary bg-primary-soft text-primary" : "hover:bg-muted",
                                  wrong && "ring-2 ring-danger",
                                )}
                              >
                                {l}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={() => setChecked(true)} disabled={mc.some((x) => !x)}>
              Evaluate both
            </Button>
            {checked && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3 text-sm">
                  <div className="font-semibold">Multi-class</div>
                  <div className="mt-1">Accuracy: <span className="font-mono">{pct(mcAcc)}</span></div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    One number, easy to read — but snippet 2 (existing customer + interested) and snippet 6 (refuses for self, possible referral) lost information the moment you picked a single label.
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <div className="font-semibold">Multi-label</div>
                  <div className="mt-1 flex gap-4">
                    <span>Hamming loss: <span className="font-mono">{mlStats.hamming.toFixed(3)}</span></span>
                    <span>Subset accuracy: <span className="font-mono">{pct(mlStats.subset)}</span></span>
                  </div>
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {mlStats.perLabel.map((p) => (
                        <tr key={p.l} className="border-t">
                          <td className="py-1">{p.l}</td>
                          <td className="py-1 text-right font-mono">P {p.p.toFixed(2)}</td>
                          <td className="py-1 text-right font-mono">R {p.r.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Richer, but evaluation is harder: subset accuracy is harsh (all labels must match), Hamming loss gives partial credit, and each label needs its own precision/recall.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="design">
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Your label structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(PRESETS).map(([k, v]) => (
                  <button key={k} onClick={() => setDesign(v)} className="cursor-pointer rounded-md border px-2 py-1 text-xs hover:bg-muted">
                    {k}
                  </button>
                ))}
              </div>
              <Select value={design.mode} onChange={(e) => setDesign({ ...design, mode: e.target.value as Mode })} className="w-full">
                <option value="multi-class">Multi-class (exactly one label)</option>
                <option value="multi-label">Multi-label (any number)</option>
                <option value="hierarchical">Hierarchical (paths, use “Parent &gt; Child”)</option>
              </Select>
              <Textarea rows={9} className="font-mono text-xs" value={design.labels} onChange={(e) => setDesign({ ...design, labels: e.target.value })} aria-label="Labels, one per line" />
              <p className="text-[11px] text-muted-foreground">One label (or path) per line. Your design is saved automatically.</p>
            </CardContent>
          </Card>
          <div className="space-y-5">
            <Card>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle>Stress test: label real snippets with your structure</CardTitle>
                <ModeBadge mode="computed" detail="Lint rules are transparent heuristics (keyword dimension detection, similarity, coverage)." />
              </CardHeader>
              <CardContent className="space-y-2">
                {SNIPPETS.map((s, i) => (
                  <div key={i} className="rounded-md border p-2">
                    <div className="font-mono text-xs">{s.text}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {flatLabels.map((l) => {
                        const on = assign[i].includes(l);
                        return (
                          <button
                            key={l}
                            onClick={() => {
                              const n = assign.map((x) => [...x]);
                              if (design.mode === "multi-label") n[i] = on ? n[i].filter((x) => x !== l) : [...n[i], l];
                              else n[i] = on ? [] : [l];
                              setAssign(n);
                              const nf = [...noFit];
                              nf[i] = false;
                              setNoFit(nf);
                            }}
                            className={cn("cursor-pointer rounded border px-1.5 py-0.5 text-[11px]", on ? "border-primary bg-primary-soft text-primary" : "hover:bg-muted")}
                          >
                            {l}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          const nf = [...noFit];
                          nf[i] = !nf[i];
                          setNoFit(nf);
                          if (nf[i]) setAssign(assign.map((x, j) => (j === i ? [] : x)));
                        }}
                        className={cn("cursor-pointer rounded border border-dashed px-1.5 py-0.5 text-[11px]", noFit[i] ? "border-danger bg-danger-soft text-danger" : "text-muted-foreground hover:bg-muted")}
                      >
                        fits none
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Design review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lints.map((l, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    {l.level === "ok" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : l.level === "warning" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    )}
                    <span>{l.text}</span>
                  </div>
                ))}
                <Callout tone="info" className="mt-3" title="Why this matters downstream">
                  Every structural flaw shows up later as an evaluation problem: overlapping labels → low inter-annotator agreement; no abstain label → inflated “Not interested” counts;
                  mixed dimensions → a confusion matrix that mixes apples and oranges. Fixing the taxonomy is cheaper than fixing the metrics.
                </Callout>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="muted">{labels.length} labels</Badge>
                  <Badge variant="muted">mode: {design.mode}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
