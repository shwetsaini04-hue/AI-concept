/**
 * Synthetic noisy call-centre transcript dataset (requirement #47).
 *
 * Every conversation is fictional. Bank names are invented. The data
 * deliberately contains Hinglish, Romanized Hindi, spelling errors, ASR
 * errors, repeated words, broken punctuation, number-format variation,
 * abbreviations, code-switching and diarization (speaker) errors. The
 * same conversations are reused across the labs and the capstone.
 */
import type { Speaker } from "./types";

export type DialogueAct =
  | "Greeting"
  | "Question"
  | "Answer"
  | "Confirmation"
  | "Objection"
  | "Request"
  | "Clarification"
  | "Refusal"
  | "Closing"
  | "Inform";

export const DIALOGUE_ACTS: DialogueAct[] = [
  "Greeting",
  "Question",
  "Answer",
  "Inform",
  "Confirmation",
  "Request",
  "Clarification",
  "Objection",
  "Refusal",
  "Closing",
];

export type EntityType =
  | "PERSON"
  | "BANK"
  | "LOAN"
  | "AMOUNT"
  | "RATE"
  | "DATE"
  | "LOCATION"
  | "PRODUCT"
  | "TENURE"
  | "EMPLOYMENT";

export const ENTITY_TYPES: EntityType[] = [
  "PERSON",
  "BANK",
  "LOAN",
  "AMOUNT",
  "RATE",
  "DATE",
  "LOCATION",
  "PRODUCT",
  "TENURE",
  "EMPLOYMENT",
];

export type NoiseTag =
  | "spelling"
  | "hinglish"
  | "romanized-hindi"
  | "incomplete"
  | "repetition"
  | "asr-error"
  | "punctuation"
  | "speaker-error"
  | "number-format"
  | "abbreviation"
  | "code-switching";

export const NOISE_LABELS: Record<NoiseTag, string> = {
  spelling: "Spelling errors",
  hinglish: "Hinglish",
  "romanized-hindi": "Romanized Hindi",
  incomplete: "Incomplete sentences",
  repetition: "Repeated words",
  "asr-error": "ASR errors",
  punctuation: "Punctuation errors",
  "speaker-error": "Speaker attribution errors",
  "number-format": "Number format variation",
  abbreviation: "Abbreviations",
  "code-switching": "Code-switching",
};

export type Intent = "interested" | "not_interested" | "insufficient_evidence";
export type Product = "personal_loan" | "home_loan" | "vehicle_loan" | "credit_card" | "none";

export interface EntityMention {
  text: string;
  type: EntityType;
}

export interface DatasetTurn {
  speaker: Speaker;
  /** Speaker label as produced by the (imperfect) diarization system, when it differs. */
  asrSpeaker?: Speaker;
  text: string;
  act: DialogueAct;
  entities?: EntityMention[];
  /** Topic/segment the turn belongs to. */
  segment: "Opening" | "Discovery" | "Qualification" | "Offer" | "Objection handling" | "Closing";
}

export interface Conversation {
  id: string;
  title: string;
  agent: "Agent A" | "Agent B" | "Agent C";
  callType: "inbound" | "outbound";
  language: "Hinglish" | "English" | "Romanized Hindi";
  quality: "clean" | "noisy" | "very noisy";
  durationSec: number;
  segment: "salaried" | "self-employed" | "student" | "retired" | "unknown";
  noise: NoiseTag[];
  turns: DatasetTurn[];
  gold: {
    intent: Intent;
    product: Product;
    amount: number | null;
    tenureMonths: number | null;
    rate: number | null;
    employment: "salaried" | "self_employed" | "unknown" | "student" | "retired";
    evidenceTurns: number[];
    objections: string[];
    needsReview: boolean;
    notes: string;
  };
}

const T = (
  speaker: Speaker,
  text: string,
  act: DialogueAct,
  segment: DatasetTurn["segment"],
  entities?: EntityMention[],
  asrSpeaker?: Speaker,
): DatasetTurn => ({ speaker, text, act, segment, entities, asrSpeaker });

export const DATASET: Conversation[] = [
  {
    id: "c01",
    title: "Personal loan — clear interest, job change",
    agent: "Agent A",
    callType: "inbound",
    language: "Hinglish",
    quality: "noisy",
    durationSec: 212,
    segment: "salaried",
    noise: ["hinglish", "spelling", "number-format", "code-switching", "romanized-hindi"],
    turns: [
      T("Agent", "hello sir kaise help karu", "Greeting", "Opening"),
      T("Customer", "sir mujhe ek personal lon chahiye", "Request", "Discovery", [{ text: "personal lon", type: "LOAN" }]),
      T("Agent", "ji sir kitne ka chahiye", "Question", "Discovery"),
      T("Customer", "around five lac", "Answer", "Discovery", [{ text: "five lac", type: "AMOUNT" }]),
      T("Agent", "okay sir aap salaried ho", "Question", "Qualification", [{ text: "salaried", type: "EMPLOYMENT" }]),
      T("Customer", "haan but abhi job change kr raha hu", "Answer", "Qualification"),
      T("Agent", "koi baat nahi sir, tenure kitna chahiye aapko", "Question", "Qualification"),
      T("Customer", "3 saal... teen saal theek rahega", "Answer", "Qualification", [{ text: "3 saal", type: "TENURE" }]),
      T("Agent", "ok sir main aapko documents ki list bhejta hu", "Inform", "Closing"),
      T("Customer", "haan bhej do, main kal tak apply kar dunga", "Confirmation", "Closing", [{ text: "kal", type: "DATE" }]),
    ],
    gold: {
      intent: "interested",
      product: "personal_loan",
      amount: 500000,
      tenureMonths: 36,
      rate: null,
      employment: "salaried",
      evidenceTurns: [1, 9],
      objections: [],
      needsReview: true,
      notes:
        "Explicit request (turn 1) and commitment to apply (turn 9). Flag for review: the customer is mid job-change, which affects eligibility, not intent.",
    },
  },
  {
    id: "c02",
    title: "Maybe next month — conditional interest",
    agent: "Agent B",
    callType: "outbound",
    language: "English",
    quality: "clean",
    durationSec: 95,
    segment: "unknown",
    noise: ["code-switching"],
    turns: [
      T("Agent", "Hello sir, I am calling from Sunrise Bank regarding loan offers.", "Greeting", "Opening", [
        { text: "Sunrise Bank", type: "BANK" },
      ]),
      T("Customer", "I might consider a loan next month.", "Inform", "Discovery", [{ text: "next month", type: "DATE" }]),
      T("Agent", "So you want a loan?", "Clarification", "Discovery"),
      T("Customer", "I said I might consider it.", "Clarification", "Discovery"),
      T("Agent", "Okay sir, shall I note down your interest for next month?", "Question", "Closing", [
        { text: "next month", type: "DATE" },
      ]),
      T("Customer", "abhi kuch confirm nahi hai", "Answer", "Closing"),
    ],
    gold: {
      intent: "insufficient_evidence",
      product: "none",
      amount: null,
      tenureMonths: null,
      rate: null,
      employment: "unknown",
      evidenceTurns: [1, 3, 5],
      objections: ["timing"],
      needsReview: false,
      notes:
        "Hedged, future, conditional interest. The agent's paraphrase (turn 2) is NOT customer evidence. Customer explicitly corrects it (turn 3).",
    },
  },
  {
    id: "c03",
    title: "Rate objection — competitor offer",
    agent: "Agent C",
    callType: "outbound",
    language: "Hinglish",
    quality: "noisy",
    durationSec: 140,
    segment: "salaried",
    noise: ["hinglish", "repetition", "code-switching", "number-format"],
    turns: [
      T("Agent", "good afternoon sir, main Sunrise Bank se bol rahi hu, aapke liye pre-approved personal loan offer hai", "Greeting", "Opening", [
        { text: "Sunrise Bank", type: "BANK" },
        { text: "personal loan", type: "LOAN" },
      ]),
      T("Customer", "kitna interest rate hai", "Question", "Offer"),
      T("Agent", "sir 14 percent se start hota hai", "Answer", "Offer", [{ text: "14 percent", type: "RATE" }]),
      T("Customer", "14 percent bahut zyada hai, mujhe 10.5 pe mil raha hai Metro Finance mein", "Objection", "Objection handling", [
        { text: "14 percent", type: "RATE" },
        { text: "10.5", type: "RATE" },
        { text: "Metro Finance", type: "BANK" },
      ]),
      T("Agent", "sir hum processing fee waive kar sakte hai", "Inform", "Objection handling"),
      T("Customer", "nahi nahi rehne do, not interested", "Refusal", "Objection handling"),
      T("Agent", "okay sir thank you for your time", "Closing", "Closing"),
    ],
    gold: {
      intent: "not_interested",
      product: "personal_loan",
      amount: null,
      tenureMonths: null,
      rate: 14,
      employment: "unknown",
      evidenceTurns: [3, 5],
      objections: ["rate", "competitor offer"],
      needsReview: false,
      notes: "Explicit refusal after a rate objection. Competitor rate (10.5) must not be extracted as the offered rate.",
    },
  },
  {
    id: "c04",
    title: "Agent puts words in the customer's mouth (diarization error)",
    agent: "Agent B",
    callType: "outbound",
    language: "Hinglish",
    quality: "very noisy",
    durationSec: 78,
    segment: "unknown",
    noise: ["hinglish", "speaker-error", "incomplete", "abbreviation"],
    turns: [
      T("Agent", "sir you want 5 lakh loan right", "Clarification", "Discovery", [{ text: "5 lakh", type: "AMOUNT" }], "Customer"),
      T("Customer", "haan... matlab dekhte hai", "Answer", "Discovery"),
      T("Agent", "great sir main application start kar deta hu", "Inform", "Offer"),
      T("Customer", "nahi abhi mat karo, pehle wife se baat karni hai", "Refusal", "Objection handling"),
      T("Agent", "ok sir, main kal call karta hu", "Closing", "Closing", [{ text: "kal", type: "DATE" }]),
    ],
    gold: {
      intent: "insufficient_evidence",
      product: "personal_loan",
      amount: 500000,
      tenureMonths: null,
      rate: null,
      employment: "unknown",
      evidenceTurns: [1, 3],
      objections: ["needs family consultation"],
      needsReview: true,
      notes:
        "Diarization labelled turn 0 as Customer. If trusted, the system sees 'you want 5 lakh loan' as customer evidence and outputs a confident 'interested'. The customer's own words are hesitant.",
    },
  },
  {
    id: "c05",
    title: "Home loan — self-employed, noisy numbers",
    agent: "Agent A",
    callType: "inbound",
    language: "Hinglish",
    quality: "noisy",
    durationSec: 305,
    segment: "self-employed",
    noise: ["hinglish", "number-format", "abbreviation", "romanized-hindi", "spelling"],
    turns: [
      T("Agent", "namaste sir, home loan ke liye call kiya tha aapne", "Greeting", "Opening", [{ text: "home loan", type: "LOAN" }]),
      T("Customer", "ha ji hum ghar le rahe hai noida mein", "Answer", "Discovery", [{ text: "noida", type: "LOCATION" }]),
      T("Agent", "sir loan amount kitna chahiye", "Question", "Discovery"),
      T("Customer", "pachas... fifty lakh approx, 50 L", "Answer", "Discovery", [
        { text: "fifty lakh", type: "AMOUNT" },
        { text: "50 L", type: "AMOUNT" },
      ]),
      T("Agent", "aap salaried ho ya business", "Question", "Qualification"),
      T("Customer", "apna business hai, kapde ka", "Answer", "Qualification", [{ text: "apna business", type: "EMPLOYMENT" }]),
      T("Agent", "sir ITR kitne saal ka hai", "Question", "Qualification"),
      T("Customer", "teen saal ka hai. rate kya chal raha hai abhi", "Question", "Offer"),
      T("Agent", "sir 8.75 se start hai for 20 years", "Answer", "Offer", [
        { text: "8.75", type: "RATE" },
        { text: "20 years", type: "TENURE" },
      ]),
      T("Customer", "theek hai, aap details whatsapp kar do", "Request", "Closing"),
    ],
    gold: {
      intent: "interested",
      product: "home_loan",
      amount: 5000000,
      tenureMonths: 240,
      rate: 8.75,
      employment: "self_employed",
      evidenceTurns: [1, 3, 9],
      objections: [],
      needsReview: false,
      notes: "Inbound call, concrete amount, requests details. '50 L' means 50 lakh = 5,000,000 INR.",
    },
  },
  {
    id: "c06",
    title: "Third-party interest — brother needs the loan",
    agent: "Agent C",
    callType: "outbound",
    language: "Hinglish",
    quality: "noisy",
    durationSec: 120,
    segment: "salaried",
    noise: ["hinglish", "repetition", "punctuation"],
    turns: [
      T("Agent", "hello sir am i speaking with mr sharma", "Greeting", "Opening", [{ text: "mr sharma", type: "PERSON" }]),
      T("Customer", "haan haan bolo", "Confirmation", "Opening"),
      T("Agent", "sir personal loan offer hai aapke liye 10.99 percent pe", "Inform", "Offer", [
        { text: "personal loan", type: "LOAN" },
        { text: "10.99 percent", type: "RATE" },
      ]),
      T("Customer", "mujhe nahi chahiye,, par mere bhai ko chahiye tha shayad", "Refusal", "Offer"),
      T("Agent", "sir unka number share kar sakte hai", "Request", "Offer"),
      T("Customer", "main usko bol dunga woh call karega", "Answer", "Closing"),
    ],
    gold: {
      intent: "not_interested",
      product: "personal_loan",
      amount: null,
      tenureMonths: null,
      rate: 10.99,
      employment: "unknown",
      evidenceTurns: [3],
      objections: ["not for self"],
      needsReview: true,
      notes: "The customer is not interested for themselves; a third party might be. Label schemas must decide how to represent referrals.",
    },
  },
  {
    id: "c07",
    title: "Car loan — English, clean, high intent",
    agent: "Agent A",
    callType: "inbound",
    language: "English",
    quality: "clean",
    durationSec: 260,
    segment: "salaried",
    noise: [],
    turns: [
      T("Agent", "Good morning, thank you for calling Sunrise Bank. How can I help you?", "Greeting", "Opening", [
        { text: "Sunrise Bank", type: "BANK" },
      ]),
      T("Customer", "Hi, I want to apply for a car loan for a Creta.", "Request", "Discovery", [{ text: "car loan", type: "LOAN" }]),
      T("Agent", "Sure. What loan amount are you looking at?", "Question", "Discovery"),
      T("Customer", "About 8 lakh, for five years.", "Answer", "Discovery", [
        { text: "8 lakh", type: "AMOUNT" },
        { text: "five years", type: "TENURE" },
      ]),
      T("Agent", "Are you salaried or self-employed?", "Question", "Qualification"),
      T("Customer", "Salaried, I work at an IT company in Pune.", "Answer", "Qualification", [
        { text: "Salaried", type: "EMPLOYMENT" },
        { text: "Pune", type: "LOCATION" },
      ]),
      T("Agent", "Great. Our rate for you would be 9.2 percent.", "Inform", "Offer", [{ text: "9.2 percent", type: "RATE" }]),
      T("Customer", "That works. Please send me the application link.", "Request", "Closing"),
    ],
    gold: {
      intent: "interested",
      product: "vehicle_loan",
      amount: 800000,
      tenureMonths: 60,
      rate: 9.2,
      employment: "salaried",
      evidenceTurns: [1, 7],
      objections: [],
      needsReview: false,
      notes: "Clean, unambiguous positive example. Useful as a few-shot anchor — but too easy to be representative.",
    },
  },
  {
    id: "c08",
    title: "ASR errors — 'lone', 'emi', 'to much'",
    agent: "Agent B",
    callType: "outbound",
    language: "Hinglish",
    quality: "very noisy",
    durationSec: 150,
    segment: "salaried",
    noise: ["asr-error", "spelling", "hinglish", "punctuation", "incomplete"],
    turns: [
      T("Agent", "sir aapka pre approved lone hai 3 lakh ka", "Inform", "Offer", [
        { text: "lone", type: "LOAN" },
        { text: "3 lakh", type: "AMOUNT" },
      ]),
      T("Customer", "emi kitna aayega", "Question", "Offer"),
      T("Agent", "sir 3 saal ke liye approx 10 hazaar per month", "Answer", "Offer", [
        { text: "3 saal", type: "TENURE" },
        { text: "10 hazaar", type: "AMOUNT" },
      ]),
      T("Customer", "to much hai yaar. and the ... the", "Objection", "Objection handling"),
      T("Agent", "sir tenure badha sakte hai 5 saal", "Inform", "Objection handling", [{ text: "5 saal", type: "TENURE" }]),
      T("Customer", "haan fir theek hai 5 saal kar do. process kya hai", "Question", "Closing", [{ text: "5 saal", type: "TENURE" }]),
    ],
    gold: {
      intent: "interested",
      product: "personal_loan",
      amount: 300000,
      tenureMonths: 60,
      rate: null,
      employment: "unknown",
      evidenceTurns: [5],
      objections: ["EMI too high"],
      needsReview: false,
      notes:
        "An objection that was resolved: the final customer turn accepts the modified offer. Classifying on the objection turn alone gives the wrong answer.",
    },
  },
  {
    id: "c09",
    title: "Hostile refusal — do not call",
    agent: "Agent C",
    callType: "outbound",
    language: "Hinglish",
    quality: "noisy",
    durationSec: 32,
    segment: "unknown",
    noise: ["hinglish", "incomplete"],
    turns: [
      T("Agent", "hello sir, loan ke regarding call tha", "Greeting", "Opening"),
      T("Customer", "roz roz call karte ho, mera number hatao list se", "Refusal", "Objection handling"),
      T("Agent", "sorry sir, main DND mein daal deti hu", "Confirmation", "Closing"),
    ],
    gold: {
      intent: "not_interested",
      product: "none",
      amount: null,
      tenureMonths: null,
      rate: null,
      employment: "unknown",
      evidenceTurns: [1],
      objections: ["do not call"],
      needsReview: true,
      notes: "Compliance-relevant: a do-not-call request must be routed to compliance, regardless of the intent label.",
    },
  },
  {
    id: "c10",
    title: "Existing customer — top-up and credit card",
    agent: "Agent A",
    callType: "inbound",
    language: "Hinglish",
    quality: "noisy",
    durationSec: 240,
    segment: "salaried",
    noise: ["hinglish", "abbreviation", "code-switching", "number-format"],
    turns: [
      T("Agent", "hello, Sunrise Bank customer care, main Neha bol rahi hu", "Greeting", "Opening", [
        { text: "Sunrise Bank", type: "BANK" },
        { text: "Neha", type: "PERSON" },
      ]),
      T("Customer", "mera already PL chal raha hai aapke yaha, top up mil sakta hai kya", "Question", "Discovery", [
        { text: "PL", type: "LOAN" },
        { text: "top up", type: "PRODUCT" },
      ]),
      T("Agent", "ji sir, 2 lakh tak top-up eligible hai aap", "Answer", "Offer", [{ text: "2 lakh", type: "AMOUNT" }]),
      T("Customer", "ok aur credit card ka bhi bata do", "Request", "Discovery", [{ text: "credit card", type: "PRODUCT" }]),
      T("Agent", "sir card ke liye alag team call karegi", "Inform", "Closing"),
      T("Customer", "theek hai top up process kar do", "Request", "Closing", [{ text: "top up", type: "PRODUCT" }]),
    ],
    gold: {
      intent: "interested",
      product: "personal_loan",
      amount: 200000,
      tenureMonths: null,
      rate: null,
      employment: "unknown",
      evidenceTurns: [1, 5],
      objections: [],
      needsReview: false,
      notes: "Multi-label territory: existing customer + top-up interest + cross-sell interest (credit card). A single-label schema loses information.",
    },
  },
  {
    id: "c11",
    title: "Romanized Hindi — eligibility concern",
    agent: "Agent B",
    callType: "outbound",
    language: "Romanized Hindi",
    quality: "noisy",
    durationSec: 180,
    segment: "student",
    noise: ["romanized-hindi", "spelling", "incomplete"],
    turns: [
      T("Agent", "namaskar ji, aapko loan ki zarurat hai kya", "Question", "Opening"),
      T("Customer", "zarurat to hai par main abhi student hu, job nahi hai", "Answer", "Qualification", [
        { text: "student", type: "EMPLOYMENT" },
      ]),
      T("Agent", "ji fir abhi loan milna mushkil hai, co-applicant ho to ho sakta hai", "Inform", "Qualification"),
      T("Customer", "papa ko puchna padega... dekhta hu", "Answer", "Closing"),
      T("Agent", "theek hai ji, aap call back kar lena", "Closing", "Closing"),
    ],
    gold: {
      intent: "insufficient_evidence",
      product: "personal_loan",
      amount: null,
      tenureMonths: null,
      rate: null,
      employment: "student",
      evidenceTurns: [1, 3],
      objections: ["eligibility"],
      needsReview: false,
      notes: "Need exists ('zarurat to hai') but eligibility blocks it and the customer defers. Need ≠ intent to apply.",
    },
  },
  {
    id: "c12",
    title: "Wrong number",
    agent: "Agent C",
    callType: "outbound",
    language: "Hinglish",
    quality: "clean",
    durationSec: 20,
    segment: "unknown",
    noise: ["hinglish"],
    turns: [
      T("Agent", "hello, kya main Rahul ji se baat kar rahi hu", "Greeting", "Opening", [{ text: "Rahul", type: "PERSON" }]),
      T("Customer", "nahi, wrong number hai", "Answer", "Opening"),
      T("Agent", "sorry for the disturbance", "Closing", "Closing"),
    ],
    gold: {
      intent: "insufficient_evidence",
      product: "none",
      amount: null,
      tenureMonths: null,
      rate: null,
      employment: "unknown",
      evidenceTurns: [1],
      objections: [],
      needsReview: false,
      notes: "Not 'not interested' — the right person was never reached. Many taxonomies miss a 'not contactable / wrong party' outcome.",
    },
  },
  {
    id: "c13",
    title: "Callback request — busy customer",
    agent: "Agent A",
    callType: "outbound",
    language: "Hinglish",
    quality: "noisy",
    durationSec: 25,
    segment: "unknown",
    noise: ["hinglish", "repetition"],
    turns: [
      T("Agent", "sir personal loan ke liye call kiya tha", "Greeting", "Opening", [{ text: "personal loan", type: "LOAN" }]),
      T("Customer", "abhi drive kar raha hu, shaam ko 6 baje call karo", "Request", "Closing", [{ text: "shaam ko 6 baje", type: "DATE" }]),
      T("Agent", "sure sir, 6 baje call karte hai", "Confirmation", "Closing", [{ text: "6 baje", type: "DATE" }]),
    ],
    gold: {
      intent: "insufficient_evidence",
      product: "personal_loan",
      amount: null,
      tenureMonths: null,
      rate: null,
      employment: "unknown",
      evidenceTurns: [1],
      objections: ["timing"],
      needsReview: false,
      notes: "A callback request is neither interest nor refusal. Useful to test whether a model over-infers interest.",
    },
  },
  {
    id: "c14",
    title: "Sarcasm and negation",
    agent: "Agent B",
    callType: "outbound",
    language: "Hinglish",
    quality: "noisy",
    durationSec: 64,
    segment: "salaried",
    noise: ["hinglish", "punctuation", "code-switching"],
    turns: [
      T("Agent", "sir aapke liye 18 percent pe instant loan hai", "Inform", "Offer", [{ text: "18 percent", type: "RATE" }]),
      T("Customer", "wah 18 percent, bahut badhiya offer hai... zaroor lunga", "Objection", "Objection handling", [
        { text: "18 percent", type: "RATE" },
      ]),
      T("Agent", "great sir toh process start karu", "Question", "Offer"),
      T("Customer", "arre mazaak kar raha tha, itna mehenga kaun lega", "Refusal", "Objection handling"),
    ],
    gold: {
      intent: "not_interested",
      product: "personal_loan",
      amount: null,
      tenureMonths: null,
      rate: 18,
      employment: "unknown",
      evidenceTurns: [3],
      objections: ["rate"],
      needsReview: false,
      notes: "Turn 1 is sarcastic ('zaroor lunga' = 'I'll definitely take it'). Keyword or single-turn classifiers mark it as interested.",
    },
  },
];

export function conversationText(c: Conversation, useAsrSpeakers = false) {
  return c.turns
    .map((t) => `${useAsrSpeakers && t.asrSpeaker ? t.asrSpeaker : t.speaker}: ${t.text}`)
    .join("\n");
}

export const INTENT_LABEL: Record<Intent, string> = {
  interested: "Interested",
  not_interested: "Not Interested",
  insufficient_evidence: "Insufficient Evidence",
};
