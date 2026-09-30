"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ReactFlow, Background, Handle, Position, MarkerType, type Node, type Edge, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertTriangle, BarChart3, BookOpen } from "lucide-react";
import { PIPELINE, STAGE_MAP, lessonsForStage } from "@/content/modules";
import type { PipelineStageId } from "@/content/types";
import { useHydrated, useProgress } from "@/lib/store/progress";
import { allMastery } from "@/lib/mastery";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { cn, pct } from "@/lib/utils";

interface D extends Record<string, unknown> {
  id: PipelineStageId;
  selected: boolean;
  mastery: number;
  lessons: number;
}

function StageNode({ data }: NodeProps<Node<D>>) {
  const s = STAGE_MAP[data.id];
  return (
    <div
      className={cn(
        "w-[260px] cursor-pointer rounded-lg border-2 bg-card px-4 py-2.5 text-center shadow-sm transition-colors",
        data.selected ? "border-primary bg-primary-soft" : "hover:border-primary/50",
      )}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="text-sm font-semibold">{s.title}</div>
      <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        {data.lessons > 0 ? (
          <>
            <span>{data.lessons} lesson{data.lessons === 1 ? "" : "s"}</span>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <span className="block h-full bg-primary" style={{ width: `${data.mastery * 100}%` }} />
            </span>
            <span>{pct(data.mastery)}</span>
          </>
        ) : (
          <span>upstream (context only)</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { stage: StageNode };

export default function SystemPage() {
  const [sel, setSel] = useState<PipelineStageId>("transcript");
  const hydrated = useHydrated();
  const lessons = useProgress((s) => s.lessons);
  const reviews = useProgress((s) => s.reviews);
  const theme = useProgress((s) => s.settings.theme);
  const mastery = useMemo(() => (hydrated ? allMastery({ lessons, reviews }) : {}), [hydrated, lessons, reviews]);

  useEffect(() => {
    const h = window.location.hash.slice(1) as PipelineStageId;
    if (h && STAGE_MAP[h]) setSel(h);
  }, []);

  const nodes: Node<D>[] = PIPELINE.map((s, i) => {
    const ls = lessonsForStage(s.id);
    const m = ls.length ? ls.reduce((a, l) => a + (mastery[l.slug]?.score ?? 0), 0) / ls.length : 0;
    return { id: s.id, type: "stage", position: { x: 0, y: i * 86 }, data: { id: s.id, selected: sel === s.id, mastery: m, lessons: ls.length }, draggable: false };
  });
  const edges: Edge[] = PIPELINE.slice(1).map((s, i) => ({ id: `e${i}`, source: PIPELINE[i].id, target: s.id, markerEnd: { type: MarkerType.ArrowClosed }, animated: true }));
  const stage = STAGE_MAP[sel];
  const stageLessons = lessonsForStage(sel);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System view</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          The complete transcript-analysis architecture. Every lesson maps onto one or more of these stages. Click a stage to see what it does, how it fails, how to measure it, and where to learn it.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="h-[980px] overflow-hidden rounded-xl border bg-subtle lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.08 }}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll={false}
            onNodeClick={(_, n) => {
              setSel(n.id as PipelineStageId);
              history.replaceState(null, "", `#${n.id}`);
            }}
            colorMode={theme === "dark" ? "dark" : "light"}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} />
          </ReactFlow>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">Stage {PIPELINE.findIndex((p) => p.id === sel) + 1} of {PIPELINE.length}</div>
              <CardTitle className="text-xl">{stage.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{stage.description}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Failure modes
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {stage.failureModes.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <BarChart3 className="h-3.5 w-3.5 text-info" /> How to measure it
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {stage.metrics.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Lessons for this stage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stageLessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">This stage is upstream of the course's scope (audio/ASR), but its errors appear in every lesson — see the Transcript Dataset for examples.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {stageLessons.map((l) => (
                    <Link key={l.slug} href={`/learn/${l.slug}`} className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:bg-muted">
                      <div>
                        <div className="font-medium">{l.title}</div>
                        <div className="line-clamp-1 text-xs text-muted-foreground">{l.tagline}</div>
                      </div>
                      <Badge variant={(mastery[l.slug]?.score ?? 0) >= 0.8 ? "success" : "muted"}>{pct(mastery[l.slug]?.score ?? 0)}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
