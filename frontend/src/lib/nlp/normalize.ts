/* Rule-based normalization pipeline for the normalization lab. Deliberately
   transparent: every stage is a small, inspectable rule set. */

export type StageId =
  | "lowercase"
  | "whitespace"
  | "punct"
  | "strip-punct"
  | "spelling"
  | "romanization"
  | "abbrev"
  | "numbers"
  | "repeats"
  | "stopwords"
  | "semantic";

export interface Stage {
  id: StageId;
  label: string;
  group: "Basic" | "Spelling" | "Romanization" | "Semantic" | "Aggressive";
  description: string;
  risky?: boolean;
}

export const STAGES: Stage[] = [
  { id: "lowercase", label: "Lowercasing", group: "Basic", description: "Case-fold everything." },
  { id: "whitespace", label: "Whitespace normalization", group: "Basic", description: "Collapse runs of spaces/newlines, trim." },
  { id: "punct", label: "Punctuation normalization", group: "Basic", description: "Collapse repeated punctuation (',,' → ',', '...' → '…'), fix spacing." },
  { id: "strip-punct", label: "Strip ALL punctuation", group: "Aggressive", description: "Remove every punctuation mark, including decimal points and '?'.", risky: true },
  { id: "spelling", label: "Spelling correction", group: "Spelling", description: "Domain lexicon: lon/lone→loan, persnal→personal, intrest→interest…" },
  { id: "romanization", label: "Romanization normalization", group: "Romanization", description: "Canonical spellings: chaiye/chahie→chahiye, nahin/nhi→nahi, lac/lakhs→lakh…" },
  { id: "abbrev", label: "Abbreviation expansion", group: "Semantic", description: "PL→personal loan, HL→home loan, CC→credit card, DND→do not disturb." },
  { id: "numbers", label: "Number normalization", group: "Semantic", description: "'five lac'→500000, '50 L'→5000000, '10 hazaar'→10000, 'teen saal'→3 years." },
  { id: "repeats", label: "Collapse repeated words", group: "Semantic", description: "'haan haan haan'→'haan', 'nahi nahi'→'nahi'." },
  { id: "stopwords", label: "Stop-word removal", group: "Aggressive", description: "Drop frequent function words (English + Hindi), including 'not' and 'nahi'.", risky: true },
  { id: "semantic", label: "Semantic normalization", group: "Semantic", description: "Replace the utterance with a canonical frame like [REQUEST product=personal_loan amount=500000]." },
];

const SPELLING: Record<string, string> = {
  lon: "loan",
  lone: "loan",
  laon: "loan",
  persnal: "personal",
  pesonal: "personal",
  personel: "personal",
  intrest: "interest",
  intrested: "interested",
  intersted: "interested",
  documnets: "documents",
  docments: "documents",
  appli: "apply",
  aplly: "apply",
  salry: "salary",
};

const ROMAN: Record<string, string> = {
  chaiye: "chahiye",
  chahie: "chahiye",
  chahye: "chahiye",
  chaahiye: "chahiye",
  nahin: "nahi",
  nhi: "nahi",
  nai: "nahi",
  nahee: "nahi",
  han: "haan",
  haa: "haan",
  ha: "haan",
  hn: "haan",
  muje: "mujhe",
  mjhe: "mujhe",
  mujhko: "mujhe",
  kr: "kar",
  krna: "karna",
  krdo: "kar do",
  hu: "hoon",
  hun: "hoon",
  lac: "lakh",
  lacs: "lakh",
  lakhs: "lakh",
  laakh: "lakh",
  lakh: "lakh",
  thik: "theek",
  thk: "theek",
  kitna: "kitna",
  kitne: "kitna",
  pese: "paise",
  paisa: "paise",
};

const ABBREV: Record<string, string> = {
  pl: "personal loan",
  hl: "home loan",
  cc: "credit card",
  dnd: "do not disturb",
  lap: "loan against property",
};

const STOP = new Set([
  "a", "an", "the", "is", "am", "are", "was", "to", "of", "in", "on", "for", "and", "or", "but", "not", "no", "do", "does", "i", "me", "my", "you", "it",
  "hai", "hain", "ka", "ki", "ke", "ko", "se", "mein", "main", "ek", "toh", "bhi", "nahi", "na", "mat", "ji", "sir", "ho", "hoon", "tha", "thi", "kya",
]);

const WORD_NUM: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, saat: 7, aath: 8, nau: 9, das: 10, bees: 20, pachas: 50, pachaas: 50, sau: 100,
};

const MULT: Record<string, number> = {
  lakh: 1e5, lac: 1e5, lakhs: 1e5, lacs: 1e5, laakh: 1e5,
  crore: 1e7, cr: 1e7, crores: 1e7,
  hazaar: 1e3, hazar: 1e3, thousand: 1e3,
};

const mapWords = (text: string, dict: Record<string, string>, keepCase = false) =>
  text.replace(/[\p{L}]+/gu, (w) => {
    const r = dict[w.toLowerCase()];
    if (r === undefined) return w;
    return keepCase ? r : r;
  });

function normalizeNumbers(text: string): string {
  const numTok = `(\\d+(?:\\.\\d+)?|${Object.keys(WORD_NUM).join("|")})`;
  const multTok = `(${Object.keys(MULT).join("|")})`;
  // amount + multiplier: "five lac", "50 L", "10 hazaar", "2.5 lakh"
  let out = text.replace(new RegExp(`\\b${numTok}\\s*${multTok}\\b`, "gi"), (_m, n: string, mult: string) => {
    const base = /\d/.test(n) ? parseFloat(n) : WORD_NUM[n.toLowerCase()];
    return String(Math.round(base * MULT[mult.toLowerCase()]));
  });
  // shorthand only after digits and case-sensitive: "50 L" → 5000000, "20K" → 20000
  out = out.replace(/\b(\d+(?:\.\d+)?)\s*(L|K)\b/g, (_m, n: string, u: string) => String(Math.round(parseFloat(n) * (u === "L" ? 1e5 : 1e3))));
  // durations: "teen saal", "3 saal", "five years"
  out = out.replace(new RegExp(`\\b${numTok}\\s*(saal|sal|years?|yrs?)\\b`, "gi"), (_m, n: string) => {
    const v = /\d/.test(n) ? parseFloat(n) : WORD_NUM[n.toLowerCase()];
    return `${v} years`;
  });
  // percentages: "14 percent", "10.5 %"
  out = out.replace(/\b(\d+(?:\.\d+)?)\s*(percent|pc|%)/gi, "$1%");
  return out;
}

function collapseRepeats(text: string) {
  return text.replace(/\b([\p{L}]+)(?:[\s,]+\1\b)+/giu, "$1");
}

const PRODUCTS: [RegExp, string][] = [
  [/personal loan|personal lon|\bpl\b/i, "personal_loan"],
  [/home loan|\bhl\b/i, "home_loan"],
  [/car loan|vehicle loan|bike loan/i, "vehicle_loan"],
  [/credit card|\bcc\b/i, "credit_card"],
  [/\bloan\b|\blon\b|\blone\b/i, "loan_unspecified"],
];

function semanticFrame(text: string) {
  const t = text.toLowerCase();
  const neg = /\b(nahi|nahin|nhi|not|don'?t|no)\b[\s\p{L}]*\b(chahiye|want|need|interested)\b|\b(chahiye|want|need|interested)\b[\s\p{L}]{0,12}\b(nahi|nahin|nhi|not)\b|not interested/iu.test(t);
  const req = /\b(chahiye|want|need|apply|interested|lena|lene)\b/i.test(t);
  const product = PRODUCTS.find(([re]) => re.test(t))?.[1];
  const amount = t.match(/\b(\d{4,})\b/)?.[1];
  const act = neg ? "REFUSAL" : req ? "REQUEST" : t.includes("?") || /\b(kitna|kya|what|how)\b/.test(t) ? "QUESTION" : "STATEMENT";
  const parts = [act];
  if (product) parts.push(`product=${product}`);
  if (amount) parts.push(`amount=${amount}`);
  return `[${parts.join(" ")}]`;
}

export function applyStage(id: StageId, text: string): string {
  switch (id) {
    case "lowercase":
      return text.toLowerCase();
    case "whitespace":
      return text.replace(/\s+/g, " ").trim();
    case "punct":
      return text
        .replace(/\.{2,}/g, "…")
        .replace(/([,!?;:])\1+/g, "$1")
        .replace(/\s+([,!?;:…])/g, "$1")
        .replace(/([,!?;:…])(?=\S)/g, "$1 ");
    case "strip-punct":
      return text.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    case "spelling":
      return mapWords(text, SPELLING);
    case "romanization":
      return mapWords(text, ROMAN);
    case "abbrev":
      return text.replace(/\b[\p{L}]+\b/gu, (w) => ABBREV[w.toLowerCase()] ?? w);
    case "numbers":
      return normalizeNumbers(text);
    case "repeats":
      return collapseRepeats(text);
    case "stopwords":
      return text
        .split(/\s+/)
        .filter((w) => !STOP.has(w.toLowerCase().replace(/[^\p{L}]/gu, "")))
        .join(" ");
    case "semantic":
      return semanticFrame(text);
  }
}

export function runPipeline(text: string, enabled: StageId[]) {
  const steps: { stage: Stage; output: string }[] = [];
  let cur = text;
  for (const s of STAGES) {
    if (!enabled.includes(s.id)) continue;
    cur = applyStage(s.id, cur);
    steps.push({ stage: s, output: cur });
  }
  return steps;
}

/** Word-level diff (LCS) for highlighting what each stage changed. */
export function wordDiff(a: string, b: string): { text: string; type: "same" | "add" | "del" }[] {
  const A = a.split(/(\s+)/).filter((x) => x.trim());
  const B = b.split(/(\s+)/).filter((x) => x.trim());
  const m = A.length;
  const n = B.length;
  const L: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: { text: string; type: "same" | "add" | "del" }[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (A[i] === B[j]) {
      out.push({ text: A[i], type: "same" });
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) out.push({ text: A[i++], type: "del" });
    else out.push({ text: B[j++], type: "add" });
  }
  while (i < m) out.push({ text: A[i++], type: "del" });
  while (j < n) out.push({ text: B[j++], type: "add" });
  return out;
}

/** Test cases where normalization destroys information. */
export interface PreservationCase {
  input: string;
  property: string;
  check: (out: string) => boolean;
  lesson: string;
}

export const PRESERVATION_CASES: PreservationCase[] = [
  {
    input: "mujhe loan nahi chahiye",
    property: "Negation ('nahi') survives",
    check: (o) => /nahi|not|refusal/i.test(o),
    lesson: "Stop-word lists usually contain negations. Removing them flips the meaning to its opposite.",
  },
  {
    input: "kya rate 10.5 percent hai?",
    property: "Decimal rate 10.5 survives",
    check: (o) => /10\.5/.test(o),
    lesson: "Stripping punctuation before number normalization turns 10.5 into '10 5'. Ordering matters.",
  },
  {
    input: "kya rate 10.5 percent hai?",
    property: "It is still recognisable as a question",
    check: (o) => /\?|question|kya/i.test(o),
    lesson: "The '?' is a strong dialogue-act and speaker cue. Removing it (and 'kya' as a stop-word) erases that signal.",
  },
  {
    input: "haan haan haan bilkul, kab apply kar sakte hai",
    property: "Emphatic repetition is still visible",
    check: (o) => /(haan[\s,]+){1,}haan/i.test(o),
    lesson: "Repetition can carry enthusiasm or hesitation. Collapsing it removes a (weak) intent signal.",
  },
  {
    input: "mera naam Lon Fernandes hai",
    property: "The name 'Lon' is not changed",
    check: (o) => /\blon\b/i.test(o),
    lesson: "Dictionary spelling correction happily 'fixes' names into domain words. Protect PERSON spans before correcting.",
  },
  {
    input: "PL ka statement bhej do, business ke liye",
    property: "'PL' is not expanded to 'personal loan' (here it means profit & loss)",
    check: (o) => !/personal/i.test(o),
    lesson: "Abbreviations are ambiguous. Expansion needs context, or should be deferred to the model.",
  },
  {
    input: "budget 5-6 lakh ka hai",
    property: "The range 5–6 lakh survives",
    check: (o) => /5\s*[-–]\s*6|500000.*600000|range/i.test(o),
    lesson: "Ranges are easy to destroy: stripping '-' then parsing numbers yields '5 600000'.",
  },
  {
    input: "US mein job lagi hai, next month shift ho raha hu",
    property: "'US' (United States) is still distinguishable from 'us'",
    check: (o) => /\bUS\b/.test(o),
    lesson: "Lowercasing merges acronyms and pronouns. Keep original text alongside normalized text.",
  },
];
