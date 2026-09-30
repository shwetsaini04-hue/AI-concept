"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { DecisionTree } from "@/components/shared/DecisionTree";
import { DECISION_TREES } from "@/content/decisions";
import { cn } from "@/lib/utils";

const OPTIONS = ["Deterministic code", "Single LLM call / fixed pipeline", "RAG", "Agent"] as const;
type Opt = (typeof OPTIONS)[number];

const SCENARIOS: { text: string; accept: Opt[]; why: string }[] = [
  {
    text: "Classify each call's intent (interested / not / insufficient) from its transcript.",
    accept: ["Single LLM call / fixed pipeline"],
    why: "Everything needed is inside the transcript. No external knowledge (no RAG) and a fixed sequence of steps (no agent).",
  },
  {
    text: "Check whether the interest rate the agent quoted matches the current rate card. The rate card is a database table keyed by product and customer segment, updated weekly.",
    accept: ["Deterministic code"],
    why: "Extract the quoted rate (NER/LLM), then do an exact lookup. Structured, keyed data calls for a query — vector similarity would be the wrong tool.",
  },
  {
    text: "Let agents ask free-text questions about 400 pages of lending policy documents that change monthly.",
    accept: ["RAG"],
    why: "Large, unstructured, changing knowledge that doesn't fit in a prompt: textbook RAG. Evaluate retrieval recall separately from answer quality.",
  },
  {
    text: "Convert 'five lac', '5 lakh' and '50 L' in transcripts to integers.",
    accept: ["Deterministic code"],
    why: "A finite, specifiable mapping. Code is exact, free and testable.",
  },
  {
    text: "Investigate why a customer's application stalled: search CRM notes, the call archive and the loan system — which system to check next depends on what the previous one revealed.",
    accept: ["Agent"],
    why: "Open-ended, tool-dependent control flow that can't be enumerated in advance. Bound it: read-only tools, step limits, logged trajectories.",
  },
  {
    text: "Detect whether the agent read the mandatory disclosure ('rates are subject to change') in each call.",
    accept: ["Deterministic code", "Single LLM call / fixed pipeline"],
    why: "Start with fuzzy/phonetic matching of the scripted phrase (cheap, auditable). Use an LLM only if paraphrased disclosures must count. No retrieval, no agent.",
  },
  {
    text: "Summarize a customer's intent across their last 10 calls, which you can fetch from the warehouse by customer ID.",
    accept: ["Single LLM call / fixed pipeline"],
    why: "Fetching by ID is a deterministic query, not semantic retrieval. Then one summarization/classification step (or map-reduce if long).",
  },
];

export default function RagAgentsLab() {
  const [answers, setAnswers] = useState<(Opt | null)[]>(SCENARIOS.map(() => null));
  const score = answers.filter((a, i) => a && SCENARIOS[i].accept.includes(a)).length;
  const answered = answers.filter(Boolean).length;
  const rag = DECISION_TREES.find((t) => t.id === "use-rag")!;
  const agent = DECISION_TREES.find((t) => t.id === "use-agent")!;

  return (
    <Tabs defaultValue="scenarios">
      <TabsList>
        <TabsTrigger value="scenarios">Do I need it? (7 scenarios)</TabsTrigger>
        <TabsTrigger value="rag">RAG decision tree</TabsTrigger>
        <TabsTrigger value="agent">Agent decision tree</TabsTrigger>
      </TabsList>
      <TabsContent value="scenarios">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Pick the simplest architecture that works</CardTitle>
            <div className="flex items-center gap-2">
              <ModeBadge mode="precomputed" />
              <Badge variant="muted">
                {score}/{answered} defensible
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {SCENARIOS.map((s, i) => {
              const a = answers[i];
              const ok = a && s.accept.includes(a);
              return (
                <div key={i} className={cn("rounded-lg border p-3", a && (ok ? "border-success/40" : "border-danger/40"))}>
                  <div className="text-sm font-medium">{s.text}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {OPTIONS.map((o) => (
                      <button
                        key={o}
                        onClick={() => setAnswers((x) => x.map((y, j) => (j === i ? o : y)))}
                        className={cn(
                          "cursor-pointer rounded-md border px-2.5 py-1 text-xs",
                          a === o && (s.accept.includes(o) ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger"),
                          a && a !== o && s.accept.includes(o) && "border-success/60 text-success",
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                  {a && (
                    <div className="mt-2 flex items-start gap-2 text-sm">
                      {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}
                      <span>{s.why}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="rag">
        <Card>
          <CardHeader>
            <CardTitle>{rag.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{rag.description}</p>
          </CardHeader>
          <CardContent>
            <DecisionTree tree={rag} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="agent">
        <Card>
          <CardHeader>
            <CardTitle>{agent.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </CardHeader>
          <CardContent>
            <DecisionTree tree={agent} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
