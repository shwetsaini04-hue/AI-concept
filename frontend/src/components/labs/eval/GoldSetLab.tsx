"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RotateCcw, Rocket } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Callout } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { cn, gaussian, pct, rng } from "@/lib/utils";

interface Tweak {
  id: number;
  name: string;
  trueDelta: number;
  quirk: number; // extra gain on whichever set you tune on (fits that set's idiosyncrasies)
}

const TWEAKS: Tweak[] = [
  { id: 1, name: "Add 3 Hinglish few-shot examples", trueDelta: 0.02, quirk: 0 },
  { id: 2, name: "Rule: 'shayad' ⇒ insufficient (from 3 failing items)", trueDelta: 0.002, quirk: 0.02 },
  { id: 3, name: "Reword the task instruction", trueDelta: 0, quirk: 0 },
  { id: 4, name: "Add an output JSON schema", trueDelta: 0.01, quirk: 0 },
  { id: 5, name: "Rule: calls mentioning 'Pune' are interested", trueDelta: -0.005, quirk: 0.013 },
  { id: 6, name: "Add sarcasm guidance", trueDelta: 0.008, quirk: 0 },
  { id: 7, name: "Move rulebook after the transcript", trueDelta: -0.005, quirk: 0 },
  { id: 8, name: "Add a 'judge the final stance' rule", trueDelta: 0.015, quirk: 0 },
  { id: 9, name: "Special-case Agent B's greeting script", trueDelta: 0, quirk: 0.013 },
  { id: 10, name: "Increase to 12 few-shot examples", trueDelta: 0.003, quirk: 0 },
  { id: 11, name: "Add 'think carefully' to the prompt", trueDelta: 0, quirk: 0 },
  { id: 12, name: "Rule: 'wrong number' ⇒ insufficient", trueDelta: 0.004, quirk: 0.007 },
];

const BASE = 0.78;
type TuneOn = "dev" | "test";

function noise(signature: string, set: string, sd: number) {
  let h = 2166136261;
  for (const ch of signature + set) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return gaussian(rng(h >>> 0)) * sd;
}

interface Version {
  v: number;
  accepted: number[];
  tried: string;
  kept: boolean;
  tuneScore: number;
  trueAcc: number;
}

export default function GoldSetLab() {
  const [tuneOn, setTuneOn] = useState<TuneOn>("test");
  const [accepted, setAccepted] = useState<number[]>([]);
  const [history, setHistory] = useState<Version[]>([]);
  const [shipped, setShipped] = useState(false);

  const sig = (acc: number[]) => [...acc].sort((a, b) => a - b).join(",") || "base";
  const trueAcc = (acc: number[]) => BASE + acc.reduce((a, id) => a + TWEAKS.find((t) => t.id === id)!.trueDelta, 0);
  const quirks = (acc: number[]) => acc.reduce((a, id) => a + TWEAKS.find((t) => t.id === id)!.quirk, 0);
  const observed = (acc: number[], set: string, includeQuirks: boolean, sd: number) => trueAcc(acc) + (includeQuirks ? quirks(acc) : 0) + noise(sig(acc), set, sd);

  const current = observed(accepted, tuneOn, true, 0.025);
  const tried = new Set(history.map((h) => h.tried));

  function tryTweak(t: Tweak) {
    if (shipped) return;
    const cand = [...accepted, t.id];
    const score = observed(cand, tuneOn, true, 0.025);
    const keep = score > current;
    setHistory((h) => [...h, { v: h.length + 1, accepted: keep ? cand : accepted, tried: t.name, kept: keep, tuneScore: keep ? score : current, trueAcc: trueAcc(keep ? cand : accepted) }]);
    if (keep) setAccepted(cand);
  }

  function reset(mode: TuneOn) {
    setTuneOn(mode);
    setAccepted([]);
    setHistory([]);
    setShipped(false);
  }

  const chart = useMemo(
    () => [
      { v: 0, tuning: observed([], tuneOn, true, 0.025), hidden: shipped ? observed([], "hidden", false, 0.012) : undefined },
      ...history.map((h) => ({ v: h.v, tuning: h.tuneScore, hidden: shipped ? observed(h.accepted, "hidden", false, 0.012) : undefined })),
    ],
    [history, shipped, tuneOn], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const finalTune = current;
  const finalTest = tuneOn === "dev" ? observed(accepted, "test", false, 0.025) : current;
  const finalHidden = observed(accepted, "hidden", false, 0.012);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>The prompt-iteration trap</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Try prompt tweaks. Each is evaluated on your tuning set; you keep it if the score goes up (what everyone does). Then ship and see a fresh, hidden sample.
            </p>
          </div>
          <ModeBadge mode="simulated" detail="Each tweak has a hidden true effect; some also fit quirks of the set you tune on. Scores include fixed sampling noise per prompt version." />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { name: "Train (200)", use: "Few-shot examples, rule ideas", cls: "bg-info-soft" },
              { name: "Dev (150)", use: "Iterate here — as often as you like", cls: tuneOn === "dev" ? "bg-success-soft ring-2 ring-success" : "bg-success-soft" },
              { name: "Test (150)", use: "Touch once, at the end", cls: tuneOn === "test" ? "bg-danger-soft ring-2 ring-danger" : "bg-warning-soft" },
              { name: "Hidden prod sample (500)", use: "What you'll really get", cls: "bg-muted" },
            ].map((s) => (
              <div key={s.name} className={cn("rounded-lg p-3 text-sm", s.cls)}>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.use}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Tune prompts against:</span>
            <Button size="sm" variant={tuneOn === "test" ? "danger" : "outline"} onClick={() => reset("test")}>
              the TEST set (anti-pattern)
            </Button>
            <Button size="sm" variant={tuneOn === "dev" ? "default" : "outline"} onClick={() => reset("dev")}>
              the DEV set (correct)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => reset(tuneOn)}>
              <RotateCcw /> Reset
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-1.5">
              {TWEAKS.map((t) => {
                const h = history.find((x) => x.tried === t.name);
                return (
                  <button
                    key={t.id}
                    disabled={tried.has(t.name) || shipped}
                    onClick={() => tryTweak(t)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left text-sm",
                      !tried.has(t.name) && !shipped && "cursor-pointer hover:bg-muted",
                      h && (h.kept ? "border-success/40 bg-success-soft" : "opacity-60"),
                    )}
                  >
                    <span>{t.name}</span>
                    {h && <Badge variant={h.kept ? "success" : "muted"}>{h.kept ? "kept" : "reverted"}</Badge>}
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              <div className="h-60">
                <ResponsiveContainer>
                  <LineChart data={chart} margin={{ left: -15, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="v" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} label={{ value: "iteration", position: "insideBottom", offset: -2, fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis domain={[0.7, 0.95]} tickFormatter={(v) => pct(v)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => pct(Number(v), 1)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line dataKey="tuning" name={`${tuneOn} score (what you see)`} stroke={tuneOn === "test" ? "var(--danger)" : "var(--success)"} strokeWidth={2} />
                    {shipped && <Line dataKey="hidden" name="hidden production sample" stroke="var(--foreground)" strokeDasharray="5 4" strokeWidth={2} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="muted">current {tuneOn} score: {pct(current, 1)}</Badge>
                <Button onClick={() => setShipped(true)} disabled={shipped || history.length < 4}>
                  <Rocket /> Ship it
                </Button>
                {history.length < 4 && <span className="text-xs text-muted-foreground">Try at least 4 tweaks first.</span>}
              </div>
            </div>
          </div>

          {shipped && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Score label={`${tuneOn === "test" ? "Test" : "Dev"} score you reported`} v={finalTune} />
              {tuneOn === "dev" && <Score label="Test set, evaluated once" v={finalTest} />}
              <Score label="Hidden production sample" v={finalHidden} emphasis />
            </div>
          )}
          {shipped && (
            <Callout tone={tuneOn === "test" && finalTune - finalHidden > 0.02 ? "danger" : "success"} title={tuneOn === "test" ? "Prompt overfitting" : "Honest estimate"}>
              {tuneOn === "test"
                ? `You reported ${pct(finalTune, 1)} but production is ${pct(finalHidden, 1)}. Selecting the best of many noisy evaluations (and adding rules that fit specific test items) inflates the score — the test set has become a dev set.`
                : `You iterated on dev (inflated to ${pct(finalTune, 1)}), then touched the test set once: ${pct(finalTest, 1)}. That single, untouched evaluation is a fair estimate of production (${pct(finalHidden, 1)}).`}
            </Callout>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Score({ label, v, emphasis }: { label: string; v: number; emphasis?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-3", emphasis && "border-foreground/30 bg-muted")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{pct(v, 1)}</div>
    </div>
  );
}
