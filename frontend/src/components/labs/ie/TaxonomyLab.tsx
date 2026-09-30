"use client";

import { useMemo, useState } from "react";
import { GripVertical, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, CornerLeftUp } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { useLabState } from "@/lib/store/progress";
import { cn, uid } from "@/lib/utils";

interface TNode {
  id: string;
  name: string;
  children: TNode[];
}

const n = (name: string, children: TNode[] = []): TNode => ({ id: uid("t"), name, children });

const PRESETS: Record<string, { tree: TNode[]; problem: string }> = {
  "Bad #1: mixed dimensions": {
    problem: "Product, intent and customer status are siblings, so one call can belong to several 'mutually exclusive' labels.",
    tree: [n("Call outcome", [n("Personal Loan"), n("Interested"), n("Existing Customer"), n("Not Interested"), n("Home Loan"), n("Callback")])],
  },
  "Bad #2: overlapping siblings": {
    problem: "“Rate concern”, “Pricing issue” and “EMI too high” describe the same underlying objection. Annotators will split arbitrarily.",
    tree: [n("Objection", [n("Rate concern"), n("Pricing issue"), n("EMI too high"), n("Documentation"), n("Paperwork hassle"), n("Timing")])],
  },
  "Bad #3: no abstain, too deep": {
    problem: "No place for insufficient evidence, single-child chains and depth 5 → sparse, unlearnable leaves.",
    tree: [n("Loan", [n("Retail", [n("Unsecured", [n("Personal Loan", [n("Interested")])])]), n("Home Loan", [n("Interested"), n("Not Interested")])])],
  },
  "Good: separate dimensions": {
    problem: "Each top-level node is its own dimension (its own field in the output schema); siblings are mutually exclusive and each set has an abstain option.",
    tree: [
      n("Product", [n("Personal Loan", [n("Top-up")]), n("Home Loan"), n("Vehicle Loan"), n("Unspecified")]),
      n("Intent", [n("Interested"), n("Not Interested"), n("Insufficient Evidence")]),
      n("Objection", [n("Rate / affordability"), n("Eligibility"), n("Documentation"), n("Timing"), n("Other")]),
    ],
  },
};

const DIMS: { dim: string; re: RegExp }[] = [
  { dim: "product", re: /loan|card|top.?up|product|vehicle|personal|home/i },
  { dim: "intent", re: /interest|intent|insufficient|unknown|refus/i },
  { dim: "customer status", re: /existing|new customer/i },
  { dim: "action", re: /callback|follow|review/i },
  { dim: "objection", re: /rate|pric|emi|document|paperwork|timing|eligib|afford|objection/i },
];
const SYN: string[][] = [
  ["rate", "pric", "emi", "afford", "expensive", "cost"],
  ["document", "paperwork", "kyc", "papers"],
  ["timing", "later", "busy", "callback"],
  ["eligib", "cibil", "income"],
];

const UTTERANCES = [
  "EMI bahut zyada hai",
  "mujhe personal loan chahiye 5 lakh ka",
  "documents bahut lagte hai aapke",
  "abhi busy hu, next week",
  "already PL hai, top up milega?",
  "CIBIL kam hai mera",
  "haan… dekhte hai",
  "home loan ka rate kya hai?",
];

function paths(nodes: TNode[], prefix: string[] = []): string[] {
  return nodes.flatMap((x) => (x.children.length ? paths(x.children, [...prefix, x.name]) : [[...prefix, x.name].join(" › ")]));
}

function depth(nodes: TNode[]): number {
  return nodes.length ? 1 + Math.max(...nodes.map((x) => depth(x.children))) : 0;
}

function lint(tree: TNode[]) {
  const out: { level: "error" | "warning" | "ok"; text: string }[] = [];
  const walk = (nodes: TNode[], parent: string) => {
    if (nodes.length === 1 && parent !== "(root)") out.push({ level: "warning", text: `“${parent}” has a single child (“${nodes[0].name}”) — that level adds no information.` });
    const dims = new Set(nodes.flatMap((x) => DIMS.filter((d) => d.re.test(x.name)).map((d) => d.dim)));
    if (dims.size > 1 && parent !== "(root)") out.push({ level: "error", text: `Children of “${parent}” mix dimensions (${[...dims].join(", ")}). Siblings should answer the same question.` });
    for (const g of SYN) {
      const hits = nodes.filter((x) => g.some((s) => x.name.toLowerCase().includes(s)));
      if (hits.length > 1) out.push({ level: "error", text: `Overlapping siblings under “${parent}”: ${hits.map((h) => `“${h.name}”`).join(", ")} describe the same thing.` });
    }
    const names = nodes.map((x) => x.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) out.push({ level: "error", text: `Duplicate labels under “${parent}”.` });
    const isLeafSet = nodes.every((x) => !x.children.length);
    if (isLeafSet && nodes.length > 1 && !nodes.some((x) => /insufficient|unknown|unspecified|other|unclear/i.test(x.name)))
      out.push({ level: "warning", text: `Label set under “${parent}” has no abstain option (Insufficient evidence / Other / Unspecified).` });
    nodes.forEach((x) => walk(x.children, x.name));
  };
  walk(tree, "(root)");
  const d = depth(tree);
  if (d > 3) out.push({ level: "warning", text: `Depth ${d}. Beyond ~3 levels, leaves get too few examples and annotators disagree more.` });
  if (!out.length) out.push({ level: "ok", text: "No structural problems detected by the linter. Now test coverage against real utterances below." });
  return out;
}

function remove(nodes: TNode[], id: string): [TNode[], TNode | null] {
  let found: TNode | null = null;
  const rec = (xs: TNode[]): TNode[] =>
    xs
      .filter((x) => {
        if (x.id === id) {
          found = x;
          return false;
        }
        return true;
      })
      .map((x) => ({ ...x, children: rec(x.children) }));
  return [rec(nodes), found];
}

function contains(node: TNode, id: string): boolean {
  return node.id === id || node.children.some((c) => contains(c, id));
}

function insertInto(nodes: TNode[], parentId: string | null, child: TNode): TNode[] {
  if (parentId === null) return [...nodes, child];
  return nodes.map((x) => (x.id === parentId ? { ...x, children: [...x.children, child] } : { ...x, children: insertInto(x.children, parentId, child) }));
}

function update(nodes: TNode[], id: string, f: (x: TNode) => TNode): TNode[] {
  return nodes.map((x) => (x.id === id ? f(x) : { ...x, children: update(x.children, id, f) }));
}

function findNode(nodes: TNode[], id: string): TNode | null {
  for (const x of nodes) {
    if (x.id === id) return x;
    const f = findNode(x.children, id);
    if (f) return f;
  }
  return null;
}

export default function TaxonomyLab() {
  const [state, setState] = useLabState<{ tree: TNode[]; preset: string }>("taxonomy", { tree: PRESETS["Bad #1: mixed dimensions"].tree, preset: "Bad #1: mixed dimensions" });
  const tree = state.tree;
  const setTree = (t: TNode[]) => setState({ ...state, tree: t });
  const [drag, setDrag] = useState<string | null>(null);
  const [assign, setAssign] = useState<string[]>(UTTERANCES.map(() => ""));

  const issues = useMemo(() => lint(tree), [tree]);
  const leaves = useMemo(() => paths(tree), [tree]);

  function move(id: string, targetId: string | null) {
    if (id === targetId) return;
    const node = findNode(tree, id);
    if (!node || (targetId && contains(node, targetId))) return; // can't drop into own subtree
    const [without, found] = remove(tree, id);
    if (found) setTree(insertInto(without, targetId, found));
  }

  // A render function (not a nested component) so inputs keep focus while typing.
  const renderNode = (x: TNode, level: number): React.ReactNode => (
    <div key={x.id}>
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDrag(x.id);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (drag) move(drag, x.id);
          setDrag(null);
        }}
        className={cn("group flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-sm", drag && drag !== x.id && "border-dashed border-primary/60")}
        style={{ marginLeft: level * 20 }}
      >
        <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground" />
        <input
          value={x.name}
          onChange={(e) => setTree(update(tree, x.id, (y) => ({ ...y, name: e.target.value })))}
          className="min-w-0 flex-1 bg-transparent outline-none"
          aria-label="Label name"
        />
        <button className="cursor-pointer rounded p-0.5 opacity-60 hover:bg-muted hover:opacity-100" title="Add child" onClick={() => setTree(insertInto(tree, x.id, n("New label")))}>
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button className="cursor-pointer rounded p-0.5 opacity-60 hover:bg-muted hover:opacity-100" title="Move to top level" onClick={() => move(x.id, null)}>
          <CornerLeftUp className="h-3.5 w-3.5" />
        </button>
        <button className="cursor-pointer rounded p-0.5 opacity-60 hover:bg-muted hover:opacity-100" title="Delete" onClick={() => setTree(remove(tree, x.id)[0])}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1 space-y-1">
        {x.children.map((c) => renderNode(c, level + 1))}
      </div>
    </div>
  );

  const usedLeaves = new Set(assign.filter((a) => a && a !== "__none" && a !== "__multi"));
  const gaps = assign.filter((a) => a === "__none").length;
  const multi = assign.filter((a) => a === "__multi").length;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Taxonomy builder</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Drag a label onto another to nest it. Rename inline. Load a bad taxonomy and fix it until the linter is happy.</p>
          </div>
          <ModeBadge mode="computed" detail="Transparent lint rules (dimension keywords, synonym groups, depth, abstain options)." />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.keys(PRESETS).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={state.preset === p ? "default" : "outline"}
                onClick={() => {
                  setState({ preset: p, tree: JSON.parse(JSON.stringify(PRESETS[p].tree)) });
                  setAssign(UTTERANCES.map(() => ""));
                }}
              >
                {p}
              </Button>
            ))}
          </div>
          {PRESETS[state.preset] && <Callout tone="muted">{PRESETS[state.preset].problem}</Callout>}
          <div className="grid gap-5 lg:grid-cols-2">
            <div
              className="min-h-64 space-y-1 rounded-lg border border-dashed p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag) move(drag, null);
                setDrag(null);
              }}
            >
              {tree.map((x) => renderNode(x, 0))}
              <Button size="sm" variant="ghost" onClick={() => setTree([...tree, n("New dimension")])}>
                <Plus /> Add top-level node
              </Button>
              <p className="pt-1 text-[11px] text-muted-foreground">Drop here (empty space) to move a label to the top level.</p>
            </div>
            <div className="space-y-2">
              {issues.map((i, k) => (
                <div key={k} className={cn("flex items-start gap-2 rounded-md border p-2 text-sm", i.level === "error" ? "border-danger/40 bg-danger-soft" : i.level === "warning" ? "border-warning/40 bg-warning-soft" : "border-success/40 bg-success-soft")}>
                  {i.level === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : i.level === "error" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}
                  {i.text}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coverage test: can every utterance get exactly one leaf?</CardTitle>
          <p className="text-sm text-muted-foreground">Leaves are shown as paths. If your taxonomy has several dimensions, pick the leaf for the most relevant one — or mark “fits several”.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {UTTERANCES.map((u, i) => (
            <div key={u} className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center">
              <span className="flex-1 font-mono text-xs">{u}</span>
              <Select value={assign[i]} onChange={(e) => setAssign(assign.map((a, j) => (j === i ? e.target.value : a)))} className="sm:w-72">
                <option value="">Choose leaf…</option>
                {leaves.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
                <option value="__multi">⚠ fits several leaves</option>
                <option value="__none">✗ fits no leaf</option>
              </Select>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant={gaps ? "danger" : "muted"}>{gaps} coverage gaps</Badge>
            <Badge variant={multi ? "warning" : "muted"}>{multi} ambiguous (overlapping labels)</Badge>
            <Badge variant="muted">
              {usedLeaves.size}/{leaves.length} leaves used
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
