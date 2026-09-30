"use client";

import { useState } from "react";
import Link from "next/link";
import { PythonRunner } from "@/components/shared/CodeSnippetBlock";
import { SNIPPETS } from "@/content/snippets";
import { LESSON_MAP } from "@/content/modules";
import { Callout } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export default function PlaygroundPage() {
  const [id, setId] = useState(SNIPPETS[0].id);
  const snip = SNIPPETS.find((s) => s.id === id)!;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Python playground</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Real CPython in your browser (Pyodide/WebAssembly) with numpy, pandas, scikit-learn, scipy and matplotlib. Pick an example, modify it, run it. The first run downloads the runtime (~10 MB).
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <nav className="space-y-1">
          {SNIPPETS.map((s) => (
            <button key={s.id} onClick={() => setId(s.id)} className={cn("w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-muted", id === s.id && "bg-primary-soft font-medium text-primary")}>
              {s.title}
              {LESSON_MAP[s.lesson] && <div className="text-[11px] font-normal text-muted-foreground">{LESSON_MAP[s.lesson].title}</div>}
            </button>
          ))}
        </nav>
        <div className="space-y-3">
          <PythonRunner key={snip.id} initialCode={snip.code} height="420px" />
          {LESSON_MAP[snip.lesson] && (
            <Link href={`/learn/${snip.lesson}`} className="text-xs text-primary hover:underline">
              Related lesson: {LESSON_MAP[snip.lesson].title} →
            </Link>
          )}
          <Callout tone="muted" title="What can't run here">
            <b>sentence-transformers</b> and PyTorch don't run in the browser Python runtime. For neural embeddings use the in-browser model in the Embeddings lab, the backend's <code>/api/embeddings</code> endpoint (when
            installed with the ML extras), or run locally: <code>pip install sentence-transformers</code> then <code>SentenceTransformer(&quot;all-MiniLM-L6-v2&quot;).encode(texts)</code>.
          </Callout>
        </div>
      </div>
    </div>
  );
}
