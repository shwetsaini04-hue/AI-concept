"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, AlertTriangle } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { useProgress } from "@/lib/store/progress";
import { cn, formatMoney, pct, rng } from "@/lib/utils";

type Kind = "input" | "normalize" | "speaker" | "ner" | "classify" | "classify-small" | "evidence" | "verify" | "router" | "human" | "final";

interface Template {
  label: string;
  latency: number; // ms
  cost: number; // $ per call
  acc: number; // success probability
  llm: boolean;
  catchRate?: number;
}

const T: Record<Kind, Template> = {
  input: { label: "Transcript", latency: 0, cost: 0, acc: 1, llm: false },
  normalize: { label: "Normalize (code)", latency: 20, cost: 0, acc: 0.99, llm: false },
  speaker: { label: "Speaker attribution", latency: 150, cost: 0.0002, acc: 0.95, llm: false },
  ner: { label: "NER (LLM)", latency: 400, cost: 0.0008, acc: 0.93, llm: true },
  classify: { label: "Classification (large LLM)", latency: 900, cost: 0.002, acc: 0.9, llm: true },
  "classify-small": { label: "Classification (small LLM)", latency: 300, cost: 0.0003, acc: 0.84, llm: true },
  evidence: { label: "Evidence extraction (LLM)", latency: 800, cost: 0.0018, acc: 0.92, llm: true },
  verify: { label: "Verification (LLM)", latency: 1100, cost: 0.0025, acc: 1, llm: true, catchRate: 0.5 },
  router: { label: "Router", latency: 50, cost: 0.0001, acc: 0.97, llm: false },
  human: { label: "Human review", latency: 4 * 3600 * 1000, cost: 0.5, acc: 0.99, llm: false },
  final: { label: "Final decision", latency: 5, cost: 0, acc: 1, llm: false },
};

interface StageData extends Record<string, unknown> {
  kind: Kind;
  share: number;
  underRouter?: boolean;
}

function StageNode({ id, data }: NodeProps<Node<StageData>>) {
  const t = T[data.kind];
  const { updateNodeData } = useReactFlow();
  return (
    <div
      className={cn(
        "min-w-[150px] rounded-lg border bg-card px-3 py-2 text-xs shadow-sm",
        data.kind === "input" && "border-primary",
        data.kind === "final" && "border-success",
        data.kind === "router" && "border-warning",
        data.kind === "human" && "border-info",
      )}
    >
      {data.kind !== "input" && <Handle type="target" position={Position.Left} />}
      <div className="font-semibold">{t.label}</div>
      {data.kind !== "input" && data.kind !== "final" && (
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          {t.latency >= 60000 ? `${t.latency / 3600000}h` : `${t.latency}ms`} · ${t.cost.toFixed(4)} · {t.catchRate ? `catches ${t.catchRate * 100}% of errors` : `acc ${t.acc}`}
        </div>
      )}
      {data.underRouter && (
        <label className="mt-1 flex items-center gap-1 text-[10px]">
          route share
          <input
            type="number"
            min={0}
            className="nodrag w-12 rounded border bg-card px-1"
            value={data.share}
            onChange={(e) => updateNodeData(id, { share: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
      )}
      {data.kind !== "final" && <Handle type="source" position={Position.Right} />}
    </div>
  );
}

const nodeTypes = { stage: StageNode };
const edgeDefaults = { markerEnd: { type: MarkerType.ArrowClosed }, animated: false };

const mk = (id: string, kind: Kind, x: number, y: number, share = 1): Node<StageData> => ({ id, type: "stage", position: { x, y }, data: { kind, share } });
const e = (s: string, t: string): Edge => ({ id: `${s}-${t}`, source: s, target: t, ...edgeDefaults });

const PRESETS: Record<string, { nodes: Node<StageData>[]; edges: Edge[]; note: string }> = {
  Sequential: {
    nodes: [mk("in", "input", 0, 120), mk("n", "normalize", 190, 120), mk("s", "speaker", 380, 120), mk("ner", "ner", 570, 40), mk("c", "classify", 570, 200), mk("ev", "evidence", 760, 120), mk("v", "verify", 950, 120), mk("f", "final", 1140, 120)],
    edges: [e("in", "n"), e("n", "s"), e("s", "ner"), e("ner", "c"), e("c", "ev"), e("ev", "v"), e("v", "f")],
    note: "A → B → C → D: simple, easy to debug, but latency adds up and every stage's error compounds.",
  },
  Parallel: {
    nodes: [mk("in", "input", 0, 150), mk("n", "normalize", 180, 150), mk("s", "speaker", 360, 150), mk("ner", "ner", 560, 30), mk("c", "classify", 560, 150), mk("ev", "evidence", 560, 270), mk("v", "verify", 780, 150), mk("f", "final", 980, 150)],
    edges: [e("in", "n"), e("n", "s"), e("s", "ner"), e("s", "c"), e("s", "ev"), e("ner", "v"), e("c", "v"), e("ev", "v"), e("v", "f")],
    note: "Independent stages run concurrently: same cost, lower latency (critical path = slowest branch).",
  },
  Routing: {
    nodes: [
      mk("in", "input", 0, 170),
      mk("n", "normalize", 170, 170),
      mk("s", "speaker", 340, 170),
      mk("r", "router", 520, 170),
      mk("cs", "classify-small", 720, 40, 6),
      mk("cl", "classify", 720, 170, 3),
      mk("h", "human", 720, 300, 1),
      mk("v", "verify", 940, 170),
      mk("f", "final", 1130, 170),
    ],
    edges: [e("in", "n"), e("n", "s"), e("s", "r"), e("r", "cs"), e("r", "cl"), e("r", "h"), e("cs", "f"), e("cl", "v"), e("v", "f"), e("h", "f")],
    note: "Input → Router → {simple: small model, complex: large model + verification, ambiguous: human}. Spend where it matters.",
  },
};

interface SimResult {
  acc: number;
  caught: number;
  reviewRate: number;
  costPer1k: number;
  p50: number;
  p95: number;
  llmCalls: number;
  issues: string[];
}

function simulate(nodes: Node<StageData>[], edges: Edge[], seed = 1): SimResult {
  const issues: string[] = [];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const children: Record<string, string[]> = {};
  const parents: Record<string, string[]> = {};
  for (const n of nodes) {
    children[n.id] = [];
    parents[n.id] = [];
  }
  for (const ed of edges) {
    if (byId[ed.source] && byId[ed.target]) {
      children[ed.source].push(ed.target);
      parents[ed.target].push(ed.source);
    }
  }
  const inputs = nodes.filter((n) => n.data.kind === "input");
  const finals = nodes.filter((n) => n.data.kind === "final");
  if (inputs.length !== 1) issues.push("Need exactly one Transcript (input) node.");
  if (finals.length !== 1) issues.push("Need exactly one Final decision node.");
  // topological sort (Kahn)
  const indeg: Record<string, number> = Object.fromEntries(nodes.map((n) => [n.id, parents[n.id].length]));
  const queue = nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const c of children[id]) if (--indeg[c] === 0) queue.push(c);
  }
  if (order.length !== nodes.length) issues.push("The graph has a cycle. Pipelines must be acyclic.");
  if (issues.length) return { acc: 0, caught: 0, reviewRate: 0, costPer1k: 0, p50: 0, p95: 0, llmCalls: 0, issues };

  const r = rng(seed);
  const N = 2000;
  let correct = 0;
  let caught = 0;
  let reviewed = 0;
  let cost = 0;
  let llm = 0;
  const lat: number[] = [];
  let reachedFinal = 0;
  for (let k = 0; k < N; k++) {
    const visited = new Set<string>([inputs[0].id]);
    const finish: Record<string, number> = {};
    let err = false;
    let wasCaught = false;
    for (const id of order) {
      if (!visited.has(id)) continue;
      const node = byId[id];
      const t = T[node.data.kind];
      const start = Math.max(0, ...parents[id].filter((p) => visited.has(p)).map((p) => finish[p] ?? 0));
      finish[id] = start + t.latency;
      cost += t.cost;
      if (t.llm) llm++;
      if (node.data.kind === "verify") {
        if (err && r() < (t.catchRate ?? 0)) {
          err = false;
          wasCaught = true;
        }
      } else if (node.data.kind === "human") {
        reviewed++;
        err = r() > t.acc;
      } else if (r() > t.acc) err = true;
      // route
      const kids = children[id];
      if (node.data.kind === "router" && kids.length) {
        const shares = kids.map((c) => byId[c].data.share ?? 1);
        const tot = shares.reduce((a, b) => a + b, 0) || 1;
        let x = r() * tot;
        let pick = kids[kids.length - 1];
        for (let i = 0; i < kids.length; i++) {
          x -= shares[i];
          if (x <= 0) {
            pick = kids[i];
            break;
          }
        }
        visited.add(pick);
      } else kids.forEach((c) => visited.add(c));
    }
    if (visited.has(finals[0].id)) {
      reachedFinal++;
      lat.push(finish[finals[0].id]);
      if (!err) correct++;
      if (wasCaught) caught++;
    }
  }
  if (reachedFinal < N) issues.push(`${Math.round((100 * (N - reachedFinal)) / N)}% of transcripts never reach the Final decision (disconnected branch).`);
  lat.sort((a, b) => a - b);
  const q = (p: number) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] ?? 0;
  return { acc: correct / N, caught: caught / N, reviewRate: reviewed / N, costPer1k: (cost / N) * 1000, p50: q(0.5), p95: q(0.95), llmCalls: llm / N, issues };
}

const fmtMs = (ms: number) => (ms >= 3600000 ? `${(ms / 3600000).toFixed(1)} h` : ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`);

function Builder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StageData>>(PRESETS.Sequential.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(PRESETS.Sequential.edges);
  const [preset, setPreset] = useState("Sequential");
  const [history, setHistory] = useState<Record<string, SimResult>>({});
  const theme = useProgress((s) => s.settings.theme);

  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, ...edgeDefaults }, es)), [setEdges]);

  // mark nodes whose parent is a router (to show share inputs)
  const decorated = useMemo(() => {
    const routerIds = new Set(nodes.filter((n) => n.data.kind === "router").map((n) => n.id));
    const under = new Set(edges.filter((ed) => routerIds.has(ed.source)).map((ed) => ed.target));
    return nodes.map((n) => (n.data.underRouter === under.has(n.id) ? n : { ...n, data: { ...n.data, underRouter: under.has(n.id) } }));
  }, [nodes, edges]);

  const result = useMemo(() => simulate(nodes, edges), [nodes, edges]);

  function load(name: string) {
    setPreset(name);
    setNodes(PRESETS[name].nodes.map((n) => ({ ...n, data: { ...n.data } })));
    setEdges(PRESETS[name].edges);
  }

  function addNode(kind: Kind) {
    const id = `${kind}-${Math.random().toString(36).slice(2, 6)}`;
    setNodes((ns) => [...ns, mk(id, kind, 300 + Math.random() * 300, 330 + Math.random() * 60)]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {Object.keys(PRESETS).map((p) => (
          <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => load(p)}>
            {p}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setHistory((h) => ({ ...h, [preset]: result }))}>
          Save result for comparison
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{PRESETS[preset]?.note}</p>
      <div className="h-[420px] overflow-hidden rounded-lg border bg-subtle">
        <ReactFlow
          nodes={decorated}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          colorMode={theme === "dark" ? "dark" : "light"}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="py-1 text-xs text-muted-foreground">Add component:</span>
        {(Object.keys(T) as Kind[])
          .filter((k) => k !== "input" && k !== "final")
          .map((k) => (
            <Button key={k} size="sm" variant="outline" onClick={() => addNode(k)}>
              <Plus /> {T[k].label}
            </Button>
          ))}
      </div>
      <p className="text-xs text-muted-foreground">Drag from a node's right handle to another node's left handle to connect. Select a node or edge and press Delete to remove it.</p>

      {result.issues.length > 0 && (
        <Callout tone="danger" title="Pipeline issues">
          <ul className="list-disc pl-5">
            {result.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Callout>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <MetricBox label="End-to-end accuracy" value={pct(result.acc, 1)} />
        <MetricBox label="Errors caught by verification" value={pct(result.caught, 1)} />
        <MetricBox label="Latency p50" value={fmtMs(result.p50)} />
        <MetricBox label="Latency p95" value={fmtMs(result.p95)} />
        <MetricBox label="Cost / 1k transcripts" value={formatMoney(result.costPer1k)} />
        <MetricBox label="LLM calls / transcript" value={result.llmCalls.toFixed(2)} />
      </div>
      {Object.keys(history).length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Saved design</th>
                <th className="py-1 pr-3 text-right">Accuracy</th>
                <th className="py-1 pr-3 text-right">p50</th>
                <th className="py-1 pr-3 text-right">p95</th>
                <th className="py-1 pr-3 text-right">$ / 1k</th>
                <th className="py-1 text-right">Human review</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(history).map(([k, h]) => (
                <tr key={k} className="border-t">
                  <td className="py-1.5 pr-3 font-medium">{k}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{pct(h.acc, 1)}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{fmtMs(h.p50)}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{fmtMs(h.p95)}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{formatMoney(h.costPer1k)}</td>
                  <td className="py-1.5 text-right font-mono">{pct(h.reviewRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Callout tone="warning" title={<span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Simplifying assumption</span>}>
        Stage errors are drawn independently. Real errors are correlated (a noisy transcript hurts every stage at once), so real end-to-end accuracy on hard slices is usually worse than this product-of-accuracies picture.
      </Callout>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function PipelineLab() {
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Architecture builder</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Build or modify a pipeline. 2,000 synthetic transcripts are pushed through it to estimate accuracy, latency and cost.</p>
        </div>
        <div className="flex gap-2">
          <ModeBadge mode="simulated" detail="Monte-Carlo simulation over stage latency/cost/accuracy assumptions shown on each node." />
          <Badge variant="muted">Seeded, reproducible</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ReactFlowProvider>
          <Builder />
        </ReactFlowProvider>
      </CardContent>
    </Card>
  );
}
