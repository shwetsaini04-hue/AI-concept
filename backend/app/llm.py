"""Provider-agnostic LLM layer.

    LLMProvider
     ├── AnthropicProvider   (Messages API)
     ├── OpenAIProvider      (Chat Completions API)
     ├── LocalProvider       (any OpenAI-compatible server, e.g. Ollama)
     └── MockProvider        (rule-based, clearly SIMULATED)
"""

from __future__ import annotations

import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass

import httpx

from .config import Settings


@dataclass
class LLMResult:
    text: str
    provider: str
    model: str
    latency_ms: float
    input_tokens: int | None = None
    output_tokens: int | None = None


class LLMProvider(ABC):
    id: str
    label: str

    def __init__(self, settings: Settings):
        self.settings = settings

    @property
    @abstractmethod
    def default_model(self) -> str | None: ...

    @abstractmethod
    def unavailable_reason(self) -> str | None:
        """None when the provider can be used; otherwise a human-readable reason."""

    @abstractmethod
    def generate(self, system: str | None, messages: list[dict], model: str | None, temperature: float | None, max_tokens: int) -> LLMResult: ...


class AnthropicProvider(LLMProvider):
    id, label = "anthropic", "Anthropic Claude"

    @property
    def default_model(self) -> str:
        return self.settings.anthropic_model

    def unavailable_reason(self) -> str | None:
        return None if self.settings.anthropic_api_key else "ANTHROPIC_API_KEY not set"

    def generate(self, system, messages, model, temperature, max_tokens):
        body: dict = {"model": model or self.default_model, "max_tokens": max_tokens, "messages": messages}
        if system:
            body["system"] = system
        if temperature is not None:
            body["temperature"] = temperature
        t0 = time.perf_counter()
        r = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": self.settings.anthropic_api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json=body,
            timeout=self.settings.request_timeout_seconds,
        )
        r.raise_for_status()
        data = r.json()
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
        usage = data.get("usage", {})
        return LLMResult(text, self.id, data.get("model", body["model"]), (time.perf_counter() - t0) * 1000, usage.get("input_tokens"), usage.get("output_tokens"))


class _OpenAICompatible(LLMProvider):
    base_url = "https://api.openai.com/v1"

    def _key(self) -> str:
        return ""

    def generate(self, system, messages, model, temperature, max_tokens):
        msgs = ([{"role": "system", "content": system}] if system else []) + messages
        body: dict = {"model": model or self.default_model, "messages": msgs, "max_completion_tokens": max_tokens}
        if temperature is not None:
            body["temperature"] = temperature
        headers = {"content-type": "application/json"}
        if self._key():
            headers["authorization"] = f"Bearer {self._key()}"
        t0 = time.perf_counter()
        r = httpx.post(f"{self.base_url.rstrip('/')}/chat/completions", headers=headers, json=body, timeout=self.settings.request_timeout_seconds)
        r.raise_for_status()
        data = r.json()
        usage = data.get("usage") or {}
        return LLMResult(
            data["choices"][0]["message"].get("content") or "",
            self.id,
            data.get("model", body["model"]),
            (time.perf_counter() - t0) * 1000,
            usage.get("prompt_tokens"),
            usage.get("completion_tokens"),
        )


class OpenAIProvider(_OpenAICompatible):
    id, label = "openai", "OpenAI"

    @property
    def default_model(self) -> str:
        return self.settings.openai_model

    def _key(self) -> str:
        return self.settings.openai_api_key

    def unavailable_reason(self) -> str | None:
        return None if self.settings.openai_api_key else "OPENAI_API_KEY not set"


class LocalProvider(_OpenAICompatible):
    id, label = "local", "Local model (OpenAI-compatible)"

    @property
    def base_url(self) -> str:  # type: ignore[override]
        return self.settings.local_base_url

    @property
    def default_model(self) -> str:
        return self.settings.local_model

    def unavailable_reason(self) -> str | None:
        return None if self.settings.local_base_url else "LOCAL_BASE_URL not set"


class MockProvider(LLMProvider):
    """Deterministic keyword heuristics. Always labelled SIMULATED in the UI — never presented as an LLM."""

    id, label = "mock", "Mock provider (simulated)"

    @property
    def default_model(self) -> str:
        return "mock-rules-v1"

    def unavailable_reason(self) -> str | None:
        return None

    def generate(self, system, messages, model, temperature, max_tokens):
        t0 = time.perf_counter()
        text = messages[-1]["content"].lower() if messages else ""
        transcript = text.split("transcript:")[-1]
        if re.search(r"nahi chahiye|not interested|rehne do|mazaak", transcript):
            intent = "not_interested"
        elif re.search(r"apply|bhej do|process kar|send me the application", transcript):
            intent = "interested"
        else:
            intent = "insufficient_evidence"
        out = f'{{"intent": "{intent}", "evidence": null, "reason": "mock keyword rules"}}'
        return LLMResult(out, self.id, self.default_model, (time.perf_counter() - t0) * 1000, None, None)


PROVIDER_CLASSES: list[type[LLMProvider]] = [AnthropicProvider, OpenAIProvider, LocalProvider, MockProvider]


def get_provider(provider_id: str, settings: Settings) -> LLMProvider:
    for cls in PROVIDER_CLASSES:
        if cls.id == provider_id:
            return cls(settings)
    raise KeyError(provider_id)
