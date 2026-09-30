"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, Trash2, Server, CheckCircle2, XCircle } from "lucide-react";
import { API_URL, api, hasBackend, type ProviderInfo } from "@/lib/api";
import { exportProgress, useHydrated, useProgress, type ProgressData } from "@/lib/store/progress";
import { MASTERY_FORMULA } from "@/lib/mastery";
import { useSyncStatus } from "@/components/layout/SyncProvider";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Switch, Callout } from "@/components/ui/primitives";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const settings = useProgress((s) => s.settings);
  const setSetting = useProgress((s) => s.setSetting);
  const replaceAll = useProgress((s) => s.replaceAll);
  const reset = useProgress((s) => s.reset);
  const learnerId = useProgress((s) => s.learnerId);
  const { status, lastSync } = useSyncStatus();
  const [health, setHealth] = useState<{ ok: boolean; db?: string; err?: string } | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasBackend()) return;
    api
      .health()
      .then((h) => setHealth({ ok: h.status === "ok", db: h.database }))
      .catch((e) => setHealth({ ok: false, err: (e as Error).message }));
    api
      .providers()
      .then((p) => setProviders(p.providers))
      .catch(() => setProviders([]));
  }, []);

  function download() {
    const blob = new Blob([JSON.stringify(exportProgress(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-ai-lab-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(f: File) {
    try {
      const data = JSON.parse(await f.text()) as ProgressData;
      if (!data || typeof data !== "object" || !("lessons" in data) || !("attempts" in data)) throw new Error("Not a progress export.");
      replaceAll({ ...data, updatedAt: Date.now() });
      setMsg("Progress imported.");
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  }

  if (!hydrated) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Settings & data</h1>

      <Card>
        <CardHeader>
          <CardTitle>Learning preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Switch
            checked={settings.socratic}
            onChange={(v) => setSetting("socratic", v)}
            label={
              <span className="text-sm">
                <b>Socratic mode</b> — don't show me the answer immediately: wrong answer → hint → second attempt → explanation.
              </span>
            }
          />
          <Switch checked={settings.theme === "dark"} onChange={(v) => setSetting("theme", v ? "dark" : "light")} label={<span className="text-sm">Dark theme</span>} />
          <p className="text-xs text-muted-foreground">Mastery: {MASTERY_FORMULA}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4" /> Backend connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!hasBackend() ? (
            <Callout tone="info" title="Running fully in the browser">
              Progress is stored in this browser's localStorage and LLM labs use the clearly-labelled simulated model. To enable <b>real model calls</b> and <b>PostgreSQL progress sync</b>, start the FastAPI backend and
              set <code>NEXT_PUBLIC_API_URL=http://localhost:8000</code> in <code>frontend/.env.local</code>, then restart the dev server. See the README.
            </Callout>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">API:</span> <code>{API_URL || "same origin (/api)"}</code>
                {health === null ? <Badge variant="muted">checking…</Badge> : health.ok ? <Badge variant="success">healthy · db: {health.db}</Badge> : <Badge variant="danger">unreachable</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">Progress sync:</span>
                <Badge variant={status === "synced" ? "success" : status === "offline" ? "danger" : "muted"}>{status}</Badge>
                {lastSync && <span className="text-xs text-muted-foreground">last synced {new Date(lastSync).toLocaleTimeString()}</span>}
              </div>
              <div>
                <div className="mb-1 text-muted-foreground">LLM providers</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {providers.map((p) => (
                    <div key={p.id} className="flex items-start gap-2 rounded-md border p-2">
                      {p.available ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                      <div>
                        <div className="font-medium">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.available ? `model: ${p.default_model}` : p.reason}</div>
                      </div>
                    </div>
                  ))}
                  {providers.length === 0 && <span className="text-muted-foreground">—</span>}
                </div>
              </div>
            </>
          )}
          <div className="text-xs text-muted-foreground">
            Learner ID: <code>{learnerId}</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={download}>
              <Download /> Export progress (JSON)
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> Import progress
            </Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Reset ALL progress, mistakes, reviews and lab designs? This cannot be undone.")) {
                  reset();
                  setMsg("Progress reset.");
                }
              }}
            >
              <Trash2 /> Reset progress
            </Button>
          </div>
          {msg && <p className="text-sm">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
