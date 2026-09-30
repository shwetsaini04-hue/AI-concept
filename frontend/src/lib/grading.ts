import type { Question } from "@/content/types";

export type AnswerValue =
  | { kind: "mcq"; index: number }
  | { kind: "multi"; indices: number[] }
  | { kind: "numeric"; value: number }
  | { kind: "text"; value: string }
  | { kind: "json"; value: string }
  | { kind: "evidence"; verdict: string; turns: number[] }
  | { kind: "label"; values: string[] };

export interface GradeResult {
  correct: boolean;
  /** 0..1 partial credit, informative only. */
  score: number;
  userAnswerText: string;
  correctAnswerText: string;
  /** Specific feedback about what was wrong (e.g. the whyWrong of a chosen option). */
  why: string;
  details: { label: string; ok: boolean; note?: string }[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ");

export function isAnswered(q: Question, a: AnswerValue | undefined): boolean {
  if (!a) return false;
  switch (a.kind) {
    case "mcq":
      return a.index >= 0;
    case "multi":
      return a.indices.length > 0;
    case "numeric":
      return Number.isFinite(a.value);
    case "text":
      return a.value.trim().length > 10;
    case "json":
      return a.value.trim().length > 1;
    case "evidence":
      return !!a.verdict && (q.kind !== "evidence" || a.turns.length > 0);
    case "label":
      return a.values.every((v) => !!v);
  }
}

export function grade(q: Question, a: AnswerValue): GradeResult {
  switch (q.kind) {
    case "mcq": {
      const idx = a.kind === "mcq" ? a.index : -1;
      const chosen = q.options[idx];
      const right = q.options.find((o) => o.correct);
      const correct = !!chosen?.correct;
      return {
        correct,
        score: correct ? 1 : 0,
        userAnswerText: chosen?.text ?? "(no answer)",
        correctAnswerText: right?.text ?? "",
        why: correct ? "" : chosen?.whyWrong ?? "This option does not match the concept being tested.",
        details: [],
      };
    }
    case "multi": {
      const picked = new Set(a.kind === "multi" ? a.indices : []);
      const details = q.options.map((o, i) => {
        const sel = picked.has(i);
        const ok = sel === !!o.correct;
        return { label: o.text, ok, note: ok ? undefined : sel ? o.whyWrong ?? "Should not be selected." : "Missed — this one applies." };
      });
      const correct = details.every((d) => d.ok);
      const wrongPicked = q.options.filter((o, i) => picked.has(i) && !o.correct);
      return {
        correct,
        score: details.filter((d) => d.ok).length / details.length,
        userAnswerText: q.options.filter((_, i) => picked.has(i)).map((o) => o.text).join("; ") || "(none)",
        correctAnswerText: q.options.filter((o) => o.correct).map((o) => o.text).join("; "),
        why: correct ? "" : wrongPicked.map((o) => o.whyWrong).filter(Boolean).join(" ") || "Some correct options were missed or incorrect ones selected.",
        details,
      };
    }
    case "numeric": {
      const v = a.kind === "numeric" ? a.value : NaN;
      const correct = Number.isFinite(v) && Math.abs(v - q.answer) <= q.tolerance;
      return {
        correct,
        score: correct ? 1 : 0,
        userAnswerText: Number.isFinite(v) ? `${v}${q.unit ? ` ${q.unit}` : ""}` : "(no answer)",
        correctAnswerText: `${q.answer}${q.unit ? ` ${q.unit}` : ""} (±${q.tolerance})`,
        why: correct ? "" : Number.isFinite(v) ? `Off by ${Math.abs(v - q.answer).toFixed(3)}.` : "No number entered.",
        details: [],
      };
    }
    case "text": {
      const text = norm(a.kind === "text" ? a.value : "");
      const details = q.rubric.map((r) => {
        const hit = r.keywords.some((k) => text.includes(norm(k).trim()));
        return { label: r.idea, ok: hit };
      });
      const hits = details.filter((d) => d.ok).length;
      const correct = hits >= q.minIdeas;
      return {
        correct,
        score: q.rubric.length ? hits / q.rubric.length : 0,
        userAnswerText: a.kind === "text" ? a.value : "",
        correctAnswerText: q.modelAnswer,
        why: correct ? "" : `Your answer covered ${hits} of the ${q.minIdeas} key ideas needed. Missing: ${details.filter((d) => !d.ok).map((d) => d.label).join("; ")}.`,
        details,
      };
    }
    case "json": {
      const raw = a.kind === "json" ? a.value : "";
      let parsed: unknown;
      let parseError = "";
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parseError = (e as Error).message;
      }
      const details = parseError
        ? [{ label: "Valid JSON", ok: false, note: parseError }]
        : [
            { label: "Valid JSON", ok: true },
            ...q.checks.map((c) => {
              let ok = false;
              try {
                ok = !!c.test(parsed);
              } catch {
                ok = false;
              }
              return { label: c.label, ok };
            }),
          ];
      const correct = details.every((d) => d.ok);
      return {
        correct,
        score: details.filter((d) => d.ok).length / details.length,
        userAnswerText: raw,
        correctAnswerText: q.modelAnswer,
        why: correct ? "" : `Failed checks: ${details.filter((d) => !d.ok).map((d) => d.label).join("; ")}.`,
        details,
      };
    }
    case "evidence": {
      const verdict = a.kind === "evidence" ? a.verdict : "";
      const turns = a.kind === "evidence" ? a.turns : [];
      const gold = new Set(q.evidenceTurns);
      const hit = turns.filter((t) => gold.has(t)).length;
      const selPrecision = turns.length ? hit / turns.length : 0;
      const verdictOk = verdict === q.correctVerdict;
      const evidenceOk = hit > 0 && selPrecision >= 0.5;
      const agentPicked = turns.filter((t) => q.transcript[t]?.speaker === "Agent" && !gold.has(t));
      const details = [
        { label: `Verdict: ${q.correctVerdict}`, ok: verdictOk, note: verdictOk ? undefined : `You chose “${verdict || "nothing"}”.` },
        {
          label: "Evidence overlaps the gold evidence",
          ok: evidenceOk,
          note: evidenceOk
            ? undefined
            : agentPicked.length
              ? "You cited agent speech — the agent's words are not evidence of the customer's state."
              : hit === 0
                ? "None of your selected turns support the verdict."
                : "Too many irrelevant turns selected.",
        },
      ];
      return {
        correct: verdictOk && evidenceOk,
        score: (verdictOk ? 0.5 : 0) + (evidenceOk ? 0.5 : 0),
        userAnswerText: `${verdict || "(no verdict)"} — turns ${turns.map((t) => t + 1).join(", ") || "none"}`,
        correctAnswerText: `${q.correctVerdict} — turns ${q.evidenceTurns.map((t) => t + 1).join(", ")}`,
        why: details.filter((d) => !d.ok).map((d) => d.note).join(" "),
        details,
      };
    }
    case "label": {
      const values = a.kind === "label" ? a.values : [];
      const details = q.items.map((it, i) => ({
        label: `“${it.text}” → ${it.answer}`,
        ok: values[i] === it.answer,
        note: values[i] === it.answer ? it.note : `You said ${values[i] || "nothing"}. ${it.note ?? ""}`.trim(),
      }));
      const frac = details.filter((d) => d.ok).length / Math.max(1, details.length);
      const correct = frac >= q.passThreshold;
      return {
        correct,
        score: frac,
        userAnswerText: values.join(", "),
        correctAnswerText: q.items.map((i) => i.answer).join(", "),
        why: correct ? "" : `${details.filter((d) => !d.ok).length} of ${details.length} labels differ from the reference.`,
        details,
      };
    }
  }
}

export function emptyAnswer(q: Question): AnswerValue {
  switch (q.kind) {
    case "mcq":
      return { kind: "mcq", index: -1 };
    case "multi":
      return { kind: "multi", indices: [] };
    case "numeric":
      return { kind: "numeric", value: NaN };
    case "text":
      return { kind: "text", value: "" };
    case "json":
      return { kind: "json", value: q.starter };
    case "evidence":
      return { kind: "evidence", verdict: "", turns: [] };
    case "label":
      return { kind: "label", values: q.items.map(() => "") };
  }
}
