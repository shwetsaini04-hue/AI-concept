"use client";

/**
 * Provider-agnostic LLM layer (frontend side).
 *
 *   LLMProvider
 *    ├── BackendProvider  → FastAPI /api/llm/generate → OpenAI | Anthropic | Local model
 *    └── MockProvider     → lab-specific, rule-based simulation (clearly labelled SIMULATED)
 *
 * Labs depend only on the LLMProvider interface, never on a vendor SDK.
 */
import { useEffect, useState } from "react";
import { api, hasBackend, type ProviderInfo } from "@/lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  system?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResult {
  text: string;
  mode: "real-model" | "simulated";
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
}

export interface LLMProvider {
  id: string;
  label: string;
  mode: "real-model" | "simulated";
  generate(req: LLMRequest): Promise<LLMResult>;
}

export class MockProvider implements LLMProvider {
  id = "mock";
  mode = "simulated" as const;
  constructor(
    private simulate: (req: LLMRequest) => string,
    public label = "Simulated model (rule-based)",
  ) {}
  async generate(req: LLMRequest): Promise<LLMResult> {
    const t0 = performance.now();
    await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
    return { text: this.simulate(req), mode: "simulated", provider: "mock", model: "simulator-v1", latencyMs: performance.now() - t0 };
  }
}

export class BackendProvider implements LLMProvider {
  mode = "real-model" as const;
  constructor(
    public id: string,
    public label: string,
    private model?: string,
  ) {}
  async generate(req: LLMRequest): Promise<LLMResult> {
    const r = await api.generate({
      provider: this.id,
      model: this.model,
      system: req.system,
      messages: req.messages,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
    });
    return {
      text: r.text,
      mode: "real-model",
      provider: r.provider,
      model: r.model,
      latencyMs: r.latency_ms,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
    };
  }
}

let providerCache: Promise<ProviderInfo[]> | null = null;

/** Real providers available through the backend (empty when no backend or no keys). */
export function useRealProviders() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [status, setStatus] = useState<"no-backend" | "loading" | "ready" | "offline">(hasBackend() ? "loading" : "no-backend");
  useEffect(() => {
    if (!hasBackend()) return;
    providerCache ??= api
      .providers()
      .then((r) => r.providers)
      .catch((e) => {
        providerCache = null;
        throw e;
      });
    providerCache
      .then((p) => {
        setProviders(p.filter((x) => x.id !== "mock"));
        setStatus("ready");
      })
      .catch(() => setStatus("offline"));
  }, []);
  return { providers, status };
}

/** Strip ```json fences and parse. Returns null on failure. */
export function parseJsonLoose(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}
