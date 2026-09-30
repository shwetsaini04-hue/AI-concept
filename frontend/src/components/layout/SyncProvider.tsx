"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api, hasBackend } from "@/lib/api";
import { exportProgress, useHydrated, useProgress } from "@/lib/store/progress";

export type SyncStatus = "local-only" | "connecting" | "synced" | "offline" | "error";

const SyncCtx = createContext<{ status: SyncStatus; lastSync: number | null }>({ status: "local-only", lastSync: null });
export const useSyncStatus = () => useContext(SyncCtx);

/**
 * Local-first persistence. localStorage is always the primary store; when a
 * backend is configured we pull once on load (newest wins) and push
 * debounced snapshots afterwards.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<SyncStatus>(hasBackend() ? "connecting" : "local-only");
  const [lastSync, setLastSync] = useState<number | null>(null);
  const pulled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated || !hasBackend() || pulled.current) return;
    pulled.current = true;
    const local = exportProgress();
    api
      .getProgress(local.learnerId)
      .then((res) => {
        if (res.data && (res.updated_at ?? 0) > local.updatedAt) {
          useProgress.getState().replaceAll(res.data);
        } else {
          return api.putProgress(local.learnerId, local);
        }
      })
      .then(() => {
        setStatus("synced");
        setLastSync(Date.now());
      })
      .catch(() => setStatus("offline"));
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !hasBackend()) return;
    const unsub = useProgress.subscribe((s, prev) => {
      if (s.updatedAt === prev.updatedAt) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const snap = exportProgress();
        api
          .putProgress(snap.learnerId, snap)
          .then(() => {
            setStatus("synced");
            setLastSync(Date.now());
          })
          .catch(() => setStatus("offline"));
      }, 1500);
    });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hydrated]);

  return <SyncCtx.Provider value={{ status, lastSync }}>{children}</SyncCtx.Provider>;
}
