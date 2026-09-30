/**
 * Prompt assembly, the rule-based SIMULATED model and the evaluation used by the
 * Prompt lab and the capstone. The simulator reproduces well-known LLM failure
 * modes and fixes them when the prompt addresses them — it is NOT an LLM.
 */
import { DATASET, type Conversation, type Intent } from "@/content/dataset";
import { parseJsonLoose, type LLMRequest } from "@/lib/llm";
/* ------------------------------------------------------------------ */
/* Prompt assembly                                                    */
/* ------------------------------------------------------------------ */

export interface Example {
  id: string;
  label: string;
  text: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "ex-clean",
    label: "Clean English → interested",
    text: `Transcript:\nCustomer: Hi, I want to apply for a car loan.\nAgent: Sure, what amount?\nCustomer: About 8 lakh. Please send me the application link.\nOutput: {"intent": "interested", "evidence": "Please send me the application link.", "reason": "Customer explicitly asks to apply."}`,
  },
  {
    id: "ex-maybe",
    label: "Hinglish hedge → insufficient_evidence",
    text: `Transcript:\nAgent: sir loan chahiye?\nCustomer: shayad baad mein, abhi pakka nahi\nOutput: {"intent": "insufficient_evidence", "evidence": "shayad baad mein, abhi pakka nahi", "reason": "Hedged, future, no commitment."}`,
  },
  {
    id: "ex-resolved",
    label: "Objection then acceptance → interested",
    text: `Transcript:\nCustomer: EMI bahut zyada hai\nAgent: tenure badha dete hai\nCustomer: theek hai phir, process karo\nOutput: {"intent": "interested", "evidence": "theek hai phir, process karo", "reason": "Objection resolved; final stance is acceptance."}`,
  },
  {
    id: "ex-sarcasm",
    label: "Sarcasm → not_interested",
    text: `Transcript:\nAgent: 20 percent pe loan hai\nCustomer: wah kya offer hai, zaroor lunga... mazaak kar raha hu, bilkul nahi\nOutput: {"intent": "not_interested", "evidence": "mazaak kar raha hu, bilkul nahi", "reason": "Sarcastic praise followed by explicit refusal."}`,
  },
];

export interface PromptConfig {
  system: string;
  task: string;
  examples: string[];
  outputFormat: string;
  constraints: string;
}

export const BAD: PromptConfig = {
  system: "",
  task: "Is this customer interested in a loan?",
  examples: [],
  outputFormat: "",
  constraints: "",
};

export const IMPROVED: PromptConfig = {
  system: "You are a careful quality analyst for loan-sales calls in India. Transcripts are noisy ASR output in Hinglish and Romanized Hindi.",
  task: "Classify the CUSTOMER's intent to pursue the loan offered in this call.",
  examples: ["ex-maybe", "ex-resolved", "ex-sarcasm", "ex-clean"],
  outputFormat: `Return only JSON: {"intent": "interested" | "not_interested" | "insufficient_evidence", "evidence": "<verbatim customer quote>", "reason": "<one sentence>"}`,
  constraints: `- Use only words spoken by the Customer as evidence. Agent questions or paraphrases are never evidence.
- Quote the evidence verbatim from the transcript.
- If the customer does not explicitly commit or refuse, answer insufficient_evidence. Do not guess.
- Judge the customer's final stance: an objection that is later resolved is not a refusal.
- Watch for sarcasm: praise followed by refusal is a refusal.`,
};

export function assemble(cfg: PromptConfig, conv: Conversation): LLMRequest {
  const parts: string[] = [];
  if (cfg.task) parts.push(cfg.task);
  if (cfg.constraints) parts.push(`Rules:\n${cfg.constraints}`);
  if (cfg.outputFormat) parts.push(`Output format:\n${cfg.outputFormat}`);
  const exs = EXAMPLES.filter((e) => cfg.examples.includes(e.id));
  if (exs.length) parts.push(`Examples:\n\n${exs.map((e) => e.text).join("\n\n")}`);
  const transcript = conv.turns.map((t) => `${t.asrSpeaker ?? t.speaker}: ${t.text}`).join("\n");
  parts.push(`Transcript:\n${transcript}\nOutput:`);
  return { system: cfg.system || undefined, messages: [{ role: "user", content: parts.join("\n\n") }], temperature: 0, maxTokens: 300 };
}

/* ------------------------------------------------------------------ */
/* Simulated model: behaviour driven by detectable prompt features.   */
/* ------------------------------------------------------------------ */

export function features(req: LLMRequest) {
  const all = `${req.system ?? ""}\n${req.messages[0].content.split("Transcript:\n").slice(0, -1).join("Transcript:\n")}`.toLowerCase();
  const examples = EXAMPLES.filter((e) => all.includes(e.text.toLowerCase().slice(0, 60)));
  return {
    json: /json/.test(all),
    labelSet: /interested/.test(all) && /not_interested/.test(all) && /insufficient_evidence/.test(all),
    abstain: /insufficient|not enough|unclear|do not guess|don't guess/.test(all),
    evidence: /evidence|quote/.test(all),
    verbatim: /verbatim|exact words|exactly as/.test(all),
    customerOnly: /customer/.test(all) && /(only|never).{0,60}(customer|agent)/.test(all),
    finalStance: /final stance|final|resolved|latest/.test(all),
    sarcasm: /sarcas/.test(all),
    reason: /reason/.test(all),
    exResolved: examples.some((e) => e.id === "ex-resolved"),
    exSarcasm: examples.some((e) => e.id === "ex-sarcasm"),
    exMaybe: examples.some((e) => e.id === "ex-maybe"),
    onlyPositiveExamples: examples.length > 0 && examples.every((e) => e.id === "ex-clean"),
  };
}

export const TEST_IDS = ["c01", "c02", "c04", "c08", "c11", "c14"];
export const TEST_SET = DATASET.filter((c) => TEST_IDS.includes(c.id));

export function simulate(req: LLMRequest): string {
  const f = features(req);
  const content = req.messages[0].content;
  const conv = TEST_SET.find((c) => content.includes(c.turns[0].text)) ?? TEST_SET[0];
  const abstainOk = (f.abstain || f.exMaybe) && !f.onlyPositiveExamples;
  let label: Intent = "interested";
  let turn = conv.gold.evidenceTurns.at(-1) ?? 0;
  switch (conv.id) {
    case "c01":
      label = "interested";
      turn = 9;
      break;
    case "c02":
      label = abstainOk ? "insufficient_evidence" : "interested";
      turn = abstainOk ? 3 : 1;
      break;
    case "c04":
      label = abstainOk && (f.finalStance || f.exResolved) ? "insufficient_evidence" : "interested";
      turn = 0; // diarization says the customer said it — the prompt can't see the error
      break;
    case "c08":
      label = f.finalStance || f.exResolved ? "interested" : "not_interested";
      turn = f.finalStance || f.exResolved ? 5 : 3;
      break;
    case "c11":
      label = abstainOk ? "insufficient_evidence" : "interested";
      turn = 1;
      break;
    case "c14":
      label = f.sarcasm || f.exSarcasm || f.finalStance ? "not_interested" : "interested";
      turn = label === "not_interested" ? 3 : 1;
      break;
  }
  const quote = conv.turns[turn].text;
  const evidence = f.verbatim ? quote : `the customer said something like "${quote.split(" ").slice(0, 4).join(" ")}…"`;

  if (!f.json) {
    const pretty = { interested: "seems interested", not_interested: "does not seem interested", insufficient_evidence: "hasn't clearly decided" }[label];
    return `Based on the conversation, the customer ${pretty} in the loan.${f.evidence ? ` Evidence: ${evidence}.` : ""} Let me know if you need anything else!`;
  }
  const lab = f.labelSet ? label : { interested: "Interested", not_interested: "Not Interested", insufficient_evidence: "Maybe later" }[label];
  const obj: Record<string, string> = { intent: lab };
  if (f.evidence) obj.evidence = evidence;
  if (f.reason) obj.reason = "Based on the customer's statements in the transcript.";
  return JSON.stringify(obj);
}

/* ------------------------------------------------------------------ */
/* Evaluation                                                         */
/* ------------------------------------------------------------------ */

export const ENUM = ["interested", "not_interested", "insufficient_evidence"];
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();

export interface ItemResult {
  conv: Conversation;
  raw: string;
  label: string | null;
  formatOk: boolean;
  labelOk: boolean;
  evidenceOk: boolean | null;
  evidenceNote: string;
}

export function evaluate(conv: Conversation, raw: string): ItemResult {
  const parsed = parseJsonLoose(raw) as Record<string, unknown> | null;
  let label: string | null = null;
  if (parsed && typeof parsed.intent === "string") label = parsed.intent;
  else {
    const t = raw.toLowerCase();
    label = /insufficient|not clearly|hasn't clearly|unclear|maybe/.test(t) ? "insufficient_evidence" : /not interested|does not seem interested|not_interested/.test(t) ? "not_interested" : /interested/.test(t) ? "interested" : null;
  }
  const formatOk = !!parsed && typeof parsed.intent === "string" && ENUM.includes(parsed.intent);
  // Canonicalize "Not Interested" / "not-interested" → "not_interested" (keep underscores!).
  const canon = (s: string) => s.toLowerCase().trim().replace(/[\s-]+/g, "_");
  const labelOk = !!label && canon(label) === conv.gold.intent;
  let evidenceOk: boolean | null = null;
  let evidenceNote = "no evidence field";
  const ev = parsed && typeof parsed.evidence === "string" ? parsed.evidence : null;
  if (ev) {
    const idx = conv.turns.findIndex((t) => norm(t.text).includes(norm(ev)) && norm(ev).length > 3);
    if (idx < 0) {
      evidenceOk = false;
      evidenceNote = "quote not found verbatim in transcript";
    } else if (conv.turns[idx].speaker !== "Customer") {
      evidenceOk = false;
      evidenceNote = `quote is really ${conv.turns[idx].speaker} speech (turn ${idx + 1})`;
    } else {
      evidenceOk = true;
      evidenceNote = `customer turn ${idx + 1}`;
    }
  }
  return { conv, raw, label, formatOk, labelOk, evidenceOk, evidenceNote };
}
