/**
 * Thin client for the optional FastAPI backend. The whole app works without
 * it (local-first); when NEXT_PUBLIC_API_URL is set, progress syncs to
 * PostgreSQL and LLM labs can make REAL model calls.
 */
import type { ProgressData } from "@/lib/store/progress";

// "/" means same origin (Vercel services: /api/* is routed to the backend service);
// a full URL (e.g. http://localhost:8000) points at a separately running backend;
// unset means browser-only mode.
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
export const API_URL = RAW_API_URL.replace(/\/$/, "");
export const hasBackend = () => RAW_API_URL.length > 0;

async function req<T>(path: string, init?: RequestInit, timeoutMs = 60000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail ?? JSON.stringify(body);
      } catch {
        /* ignore */
      }
      throw new Error(`${res.status}: ${detail}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export interface ProviderInfo {
  id: string;
  label: string;
  available: boolean;
  default_model: string | null;
  reason?: string | null;
}

export const api = {
  health: () => req<{ status: string; database: string }>("/api/health", undefined, 4000),
  providers: () => req<{ providers: ProviderInfo[] }>("/api/llm/providers", undefined, 5000),
  generate: (body: {
    provider: string;
    model?: string;
    system?: string;
    messages: { role: "user" | "assistant"; content: string }[];
    temperature?: number;
    max_tokens?: number;
  }) =>
    req<{ text: string; provider: string; model: string; latency_ms: number; input_tokens: number | null; output_tokens: number | null }>(
      "/api/llm/generate",
      { method: "POST", body: JSON.stringify(body) },
    ),
  getProgress: (learnerId: string) => req<{ data: ProgressData | null; updated_at: number | null }>(`/api/progress/${encodeURIComponent(learnerId)}`, undefined, 5000),
  putProgress: (learnerId: string, data: ProgressData) =>
    req<{ ok: boolean }>(`/api/progress/${encodeURIComponent(learnerId)}`, { method: "PUT", body: JSON.stringify({ data, updated_at: data.updatedAt }) }, 8000),
};
