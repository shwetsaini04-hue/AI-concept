"use client";

import { useEffect, useState } from "react";
import { Cpu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { loadNeural, neuralEmbed, tfidfEmbed, type Vec } from "@/lib/embeddings";
import { cn } from "@/lib/utils";

export type EmbedMode = "tfidf" | "neural";

/** Embeds texts with the chosen method. Neural embeddings are computed asynchronously in the browser. */
export function useEmbeddings(texts: string[], mode: EmbedMode) {
  const key = texts.join("\u0001");
  const [vectors, setVectors] = useState<Vec[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setError("");
    if (!texts.length) {
      setVectors([]);
      return;
    }
    if (mode === "tfidf") {
      setVectors(tfidfEmbed(texts));
      return;
    }
    setBusy(true);
    neuralEmbed(texts)
      .then((v) => alive && setVectors(v))
      .catch((e) => alive && setError(String(e?.message ?? e)))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [key, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return { vectors, error, busy };
}

export function EmbedModeSwitch({ mode, setMode }: { mode: EmbedMode; setMode: (m: EmbedMode) => void }) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function enableNeural() {
    setLoading(true);
    setErr("");
    try {
      await loadNeural(setStatus);
      setMode("neural");
    } catch (e) {
      setErr(`Could not load the model: ${(e as Error).message}. It downloads from the Hugging Face CDN — check your connection.`);
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button onClick={() => setMode("tfidf")} className={cn("cursor-pointer rounded-md px-3 py-1.5 text-sm", mode === "tfidf" && "bg-card font-medium shadow-sm")}>
            Lexical (TF-IDF char n-grams)
          </button>
          <button onClick={() => (mode === "neural" ? null : enableNeural())} className={cn("cursor-pointer rounded-md px-3 py-1.5 text-sm", mode === "neural" && "bg-card font-medium shadow-sm")}>
            Neural (all-MiniLM-L6-v2)
          </button>
        </div>
        <ModeBadge
          mode={mode === "neural" ? "real-local" : "computed"}
          detail={mode === "neural" ? "Real sentence-transformer model running in your browser via transformers.js (ONNX, 8-bit)." : "Character 3–4-gram TF-IDF vectors: similarity of spelling, not meaning."}
        />
        {mode === "tfidf" && !loading && (
          <Button size="sm" variant="outline" onClick={enableNeural}>
            <Cpu /> Load neural model (~23 MB)
          </Button>
        )}
        {loading && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {status || "Loading…"}
          </span>
        )}
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
