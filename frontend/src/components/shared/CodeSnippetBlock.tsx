"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { Play, RotateCcw, Loader2, ExternalLink } from "lucide-react";
import type { CodeSnippet } from "@/content/types";
import { Button } from "@/components/ui/primitives";
import { ModeBadge } from "./ModeBadge";
import { runPython, type PyResult } from "@/lib/pyodide";
import { useProgress } from "@/lib/store/progress";

/** Editable, runnable Python block (CodeEditor + runner). */
export function PythonRunner({ initialCode, height = "320px", onCodeChange }: { initialCode: string; height?: string; onCodeChange?: (c: string) => void }) {
  const theme = useProgress((s) => s.settings.theme);
  const [code, setCode] = useState(initialCode);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<PyResult | null>(null);
  const extensions = useMemo(() => [python()], []);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const r = await runPython(code, setStatus);
      setResult(r);
    } catch (e) {
      setResult({ stdout: "", stderr: "", images: [], error: `Could not start Python: ${(e as Error).message}. Check your internet connection (Pyodide loads from a CDN).`, ms: 0 });
    } finally {
      setRunning(false);
      setStatus("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border text-[13px]">
        <div className="flex items-center justify-between border-b bg-muted px-3 py-1.5">
          <span className="font-mono text-xs text-muted-foreground">python</span>
          <ModeBadge mode="computed" detail="CPython compiled to WebAssembly (Pyodide) — real numpy / pandas / scikit-learn." />
        </div>
        <CodeMirror
          value={code}
          height={height}
          theme={theme === "dark" ? "dark" : "light"}
          extensions={extensions}
          onChange={(v) => {
            setCode(v);
            onCodeChange?.(v);
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <Play />} Run
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCode(initialCode)} disabled={running}>
          <RotateCcw /> Reset code
        </Button>
        {status && <span className="text-xs text-muted-foreground">{status}</span>}
        {result && !result.error && <span className="text-xs text-muted-foreground">Finished in {(result.ms / 1000).toFixed(1)}s</span>}
      </div>
      {result && (
        <div className="space-y-2">
          {(result.stdout || result.error || result.stderr) && (
            <pre className="max-h-96 overflow-auto rounded-lg border bg-subtle p-3 font-mono text-xs leading-relaxed">
              {result.stdout}
              {result.stderr && <span className="text-warning">{result.stderr}</span>}
              {result.error && <span className="text-danger">{result.error}</span>}
            </pre>
          )}
          {result.images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={`data:image/png;base64,${img}`} alt={`Figure ${i + 1}`} className="max-w-full rounded-lg border bg-white" />
          ))}
          {!result.stdout && !result.error && !result.images.length && <div className="text-xs text-muted-foreground">(no output — add a print())</div>}
        </div>
      )}
    </div>
  );
}

export function CodeSnippetBlock({ snippet }: { snippet: CodeSnippet }) {
  return (
    <div className="space-y-2">
      {snippet.note && <p className="text-sm text-muted-foreground">{snippet.note}</p>}
      <PythonRunner initialCode={snippet.code} height="auto" />
      <Link href="/playground" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        Open the full Python playground <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}
