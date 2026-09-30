/**
 * Real BPE tokenizers (js-tiktoken) running in the browser. The rank files are
 * large, so they are loaded on demand in their own chunks.
 */
import { Tiktoken } from "js-tiktoken/lite";

export type EncodingName = "o200k_base" | "cl100k_base";

export const ENCODINGS: { id: EncodingName; label: string; note: string }[] = [
  { id: "o200k_base", label: "o200k_base (~200k vocab)", note: "Used by OpenAI's GPT-4o-family models." },
  { id: "cl100k_base", label: "cl100k_base (~100k vocab)", note: "Used by GPT-4 / GPT-3.5-turbo." },
];

const cache: Partial<Record<EncodingName, Promise<Tiktoken>>> = {};

export function getEncoder(name: EncodingName): Promise<Tiktoken> {
  if (!cache[name]) {
    cache[name] = (name === "o200k_base" ? import("js-tiktoken/ranks/o200k_base") : import("js-tiktoken/ranks/cl100k_base")).then(
      (m) => new Tiktoken(m.default),
    );
  }
  return cache[name]!;
}

export interface TokenPiece {
  ids: number[];
  text: string;
  /** True when several byte-level tokens were needed to form valid UTF-8 characters. */
  multiByte: boolean;
}

/**
 * Decode tokens one by one for display. Byte-level BPE can split a single
 * Devanagari character across several tokens; those decode to U+FFFD on their
 * own, so we merge them until they form valid text.
 */
export function pieces(enc: Tiktoken, ids: number[]): TokenPiece[] {
  const out: TokenPiece[] = [];
  let buf: number[] = [];
  for (let i = 0; i < ids.length; i++) {
    buf.push(ids[i]);
    const text = enc.decode(buf);
    if (text.includes("�") && buf.length < 6 && i < ids.length - 1) continue;
    out.push({ ids: buf, text, multiByte: buf.length > 1 });
    buf = [];
  }
  if (buf.length) out.push({ ids: buf, text: enc.decode(buf), multiByte: buf.length > 1 });
  return out;
}

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
