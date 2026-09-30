import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pct = (x: number, digits = 0) =>
  Number.isFinite(x) ? `${(x * 100).toFixed(digits)}%` : "—";

export const fmt = (x: number, digits = 3) =>
  Number.isFinite(x) ? x.toFixed(digits) : "—";

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);

export function formatNumber(n: number, digits = 0) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function formatMoney(n: number, currency = "$") {
  if (n >= 1000) return `${currency}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `${currency}${n.toFixed(2)}`;
  return `${currency}${n.toFixed(4)}`;
}

/** Deterministic PRNG (mulberry32) so simulated datasets are reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample via Box–Muller. */
export function gaussian(rand: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function relativeDay(ts: number, now = Date.now()) {
  const startOf = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const diff = Math.round((startOf(ts) - startOf(now)) / DAY_MS);
  if (diff <= 0) return diff === 0 ? "today" : "overdue";
  if (diff === 1) return "tomorrow";
  return `in ${diff} days`;
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function normalizeForMatch(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
