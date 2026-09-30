"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { cn } from "@/lib/utils";

const ITEMS: { u: string; closed: string; runs: [string, string, string]; category: string }[] = [
  { u: "14 percent bahut zyada hai", closed: "Not Interested", runs: ["High interest rate", "Rate too high", "Pricing concern"], category: "Rate Concern" },
  { u: "EMI is too high for me", closed: "Not Interested", runs: ["EMI unaffordable", "High EMI", "Affordability"], category: "Rate Concern" },
  { u: "Metro Finance is cheaper", closed: "Not Interested", runs: ["Competitor offer", "Better rate elsewhere", "Competitor pricing"], category: "Rate Concern" },
  { u: "rate kam karo toh sochunga", closed: "Unknown", runs: ["Wants lower rate", "Rate negotiation", "Conditional on rate"], category: "Rate Concern" },
  { u: "CIBIL score low hai", closed: "Not Interested", runs: ["Low credit score", "Credit score issue", "Eligibility (CIBIL)"], category: "Eligibility Concern" },
  { u: "I'm a student, no job", closed: "Not Interested", runs: ["No income", "Student - ineligible", "Employment status"], category: "Eligibility Concern" },
  { u: "salary below your minimum", closed: "Not Interested", runs: ["Income too low", "Below income criteria", "Eligibility"], category: "Eligibility Concern" },
  { u: "call me after Diwali", closed: "Unknown", runs: ["Timing - later", "Postponed", "Festival timing"], category: "Timing Concern" },
  { u: "abhi busy hu, shaam ko", closed: "Unknown", runs: ["Busy now", "Callback requested", "Timing"], category: "Timing Concern" },
  { u: "maybe next year", closed: "Unknown", runs: ["Future interest", "Timing - next year", "Deferred"], category: "Timing Concern" },
  { u: "too many documents", closed: "Not Interested", runs: ["Documentation burden", "Paperwork", "Too many documents"], category: "Documentation Concern" },
  { u: "salary slips nahi hai 6 mahine ki", closed: "Not Interested", runs: ["Missing salary slips", "Documentation gap", "Income proof missing"], category: "Documentation Concern" },
  { u: "KYC is a hassle", closed: "Not Interested", runs: ["KYC friction", "Process complexity", "Documentation"], category: "Documentation Concern" },
  { u: "your app keeps crashing", closed: "Not Interested", runs: ["App issues", "Technical problems", "Digital experience"], category: "NEW: Digital Experience" },
  { u: "app mein OTP nahi aata", closed: "Unknown", runs: ["OTP failure", "Login issue", "App/OTP problem"], category: "NEW: Digital Experience" },
  { u: "last time agent was rude", closed: "Not Interested", runs: ["Bad past experience", "Agent behaviour", "Service complaint"], category: "NEW: Service Complaint" },
];

const TRADEOFF = [
  { dim: "Consistency", closed: 5, open: 2, hybrid: 4, note: "Same input → same label; metrics comparable over months." },
  { dim: "Discovery", closed: 1, open: 5, hybrid: 4, note: "Can the system surface problems nobody anticipated (the app crashing)?" },
  { dim: "Governance", closed: 5, open: 1, hybrid: 4, note: "Labels have owners, definitions and versions; changes are deliberate." },
  { dim: "Flexibility", closed: 2, open: 5, hybrid: 4, note: "How cheaply can the label space change?" },
  { dim: "Evaluation ease", closed: 5, open: 1, hybrid: 3, note: "Exact-match metrics vs judging free text." },
];

const SCENARIOS: { s: string; answer: "Closed" | "Open" | "Hybrid"; why: string }[] = [
  { s: "Monthly board KPI: % of calls lost to rate objections, compared month over month.", answer: "Closed", why: "Trend reporting needs stable, governed categories. Open labels would drift between months." },
  { s: "A new product launched last week; nobody knows what customers dislike about it yet.", answer: "Open", why: "Discovery phase: let the model describe reasons freely, then cluster and read them." },
  { s: "Production objection tracking for an existing product, but you don't want to miss new issues.", answer: "Hybrid", why: "Closed set for known objections + ‘Other: <free text>’, reviewed monthly; promote recurring ‘Other’ clusters into the taxonomy." },
  { s: "Compliance: detect whether the mandatory disclosure was read.", answer: "Closed", why: "A binary, precisely defined check. No room for creative labels." },
];

export default function OpenClosedLab() {
  const [run, setRun] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const closedCounts = ITEMS.reduce<Record<string, number>>((a, x) => ((a[x.closed] = (a[x.closed] ?? 0) + 1), a), {});
  const distinct = new Set(ITEMS.map((x) => x.runs[run])).size;
  const categories = [...new Set(ITEMS.map((x) => x.category))];

  return (
    <Tabs defaultValue="closed">
      <TabsList>
        <TabsTrigger value="closed">Closed set</TabsTrigger>
        <TabsTrigger value="open">Open set</TabsTrigger>
        <TabsTrigger value="hybrid">Discover → govern</TabsTrigger>
        <TabsTrigger value="choose">Trade-offs & scenarios</TabsTrigger>
      </TabsList>

      <TabsContent value="closed">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Closed set: Interested / Not Interested / Unknown</CardTitle>
            <ModeBadge mode="precomputed" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(closedCounts).map(([k, v]) => (
                <Badge key={k} variant={k === "Not Interested" ? "danger" : "muted"}>
                  {k}: {v}
                </Badge>
              ))}
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {ITEMS.map((x) => (
                <div key={x.u} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs">
                  <span className="font-mono">{x.u}</span>
                  <Badge variant="muted">{x.closed}</Badge>
                </div>
              ))}
            </div>
            <Callout tone="warning">
              Perfectly consistent — and almost useless for the product team. Rate, eligibility, documentation and a broken app all collapse into “Not Interested”. You can’t act on <i>why</i>.
            </Callout>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="open">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Open set: the model describes each reason in its own words</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Same prompt, same transcripts, three runs. Watch the labels drift.</p>
            </div>
            <div className="flex items-center gap-2">
              <ModeBadge mode="precomputed" detail="Hand-written to illustrate typical open-set naming drift; not outputs of a specific model." />
              {[0, 1, 2].map((r) => (
                <button key={r} onClick={() => setRun(r)} className={cn("cursor-pointer rounded-md border px-2.5 py-1 text-xs", run === r && "border-primary bg-primary-soft text-primary")}>
                  Run {r + 1}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="warning">{distinct} distinct labels for {ITEMS.length} utterances</Badge>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {ITEMS.map((x) => (
                <div key={x.u} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs">
                  <span className="font-mono">{x.u}</span>
                  <Badge variant="info">{x.runs[run]}</Badge>
                </div>
              ))}
            </div>
            <Callout tone="info">
              Rich and it surfaces surprises (“App issues”, “Agent behaviour”) — but “Rate too high”, “Pricing concern” and “High EMI” are the same thing, the names change between runs, and you can't count or trend them without normalizing first.
            </Callout>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="hybrid">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Cluster the open labels, then promote stable clusters into the taxonomy</CardTitle>
            <ModeBadge mode="precomputed" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((c) => {
                const members = ITEMS.filter((x) => x.category === c);
                const isNew = c.startsWith("NEW");
                return (
                  <div key={c} className={cn("rounded-lg border p-3", isNew && "border-warning/50 bg-warning-soft")}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{c.replace("NEW: ", "")}</span>
                      {isNew ? <Badge variant="warning">discovered — review</Badge> : <Badge variant="success">in taxonomy</Badge>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {[...new Set(members.flatMap((m) => m.runs))].map((r) => (
                        <span key={r} className="rounded bg-card px-1.5 py-0.5 text-[10px]">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Production uses a <b>closed</b> objection set + “Other: &lt;free-text reason&gt;”.</li>
              <li>Monthly, embed and <b>cluster</b> the “Other” reasons (see the Clustering lesson).</li>
              <li>A taxonomy owner reviews clusters; recurring, actionable ones (Digital Experience) get a definition, examples and a version bump.</li>
              <li>Re-label a sample, update the gold set, re-evaluate. Old months are mapped to the new version for trend continuity.</li>
            </ol>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="choose">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Trade-off matrix</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">Dimension</th>
                    <th className="py-1 pr-3">Closed</th>
                    <th className="py-1 pr-3">Open</th>
                    <th className="py-1 pr-3">Hybrid</th>
                    <th className="py-1">Why it matters</th>
                  </tr>
                </thead>
                <tbody>
                  {TRADEOFF.map((t) => (
                    <tr key={t.dim} className="border-t">
                      <td className="py-1.5 pr-3 font-medium">{t.dim}</td>
                      {[t.closed, t.open, t.hybrid].map((v, i) => (
                        <td key={i} className="py-1.5 pr-3 font-mono text-primary">
                          {"●".repeat(v)}
                          <span className="text-muted-foreground/30">{"●".repeat(5 - v)}</span>
                        </td>
                      ))}
                      <td className="py-1.5 text-xs text-muted-foreground">{t.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Which approach fits?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {SCENARIOS.map((s, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="text-sm">{s.s}</div>
                  <div className="mt-2 flex gap-1.5">
                    {(["Closed", "Open", "Hybrid"] as const).map((o) => (
                      <button
                        key={o}
                        onClick={() => setAnswers((a) => ({ ...a, [i]: o }))}
                        className={cn(
                          "cursor-pointer rounded-md border px-3 py-1 text-xs",
                          answers[i] === o && (o === s.answer ? "border-success bg-success-soft text-success" : "border-danger bg-danger-soft text-danger"),
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                  {answers[i] && (
                    <div className="mt-2 flex items-start gap-2 text-sm">
                      {answers[i] === s.answer ? <Check className="mt-0.5 h-4 w-4 text-success" /> : <X className="mt-0.5 h-4 w-4 text-danger" />}
                      <span>
                        <b>{s.answer}.</b> {s.why}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
