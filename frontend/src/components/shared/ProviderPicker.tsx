"use client";

import Link from "next/link";
import { Select } from "@/components/ui/primitives";
import { ModeBadge } from "./ModeBadge";
import { useRealProviders } from "@/lib/llm";

/**
 * Lets the learner choose between the SIMULATED model and any REAL provider the
 * backend exposes. Real providers only appear when the backend is running and
 * has API keys configured.
 */
export function ProviderPicker({ value, onChange }: { value: string; onChange: (id: string, label: string) => void }) {
  const { providers, status } = useRealProviders();
  const available = providers.filter((p) => p.available);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value}
        onChange={(e) => {
          const p = available.find((x) => x.id === e.target.value);
          onChange(e.target.value, p ? `${p.label}${p.default_model ? ` · ${p.default_model}` : ""}` : "Simulated model");
        }}
        aria-label="Model provider"
      >
        <option value="mock">Simulated model (no API call)</option>
        {available.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {p.default_model ? ` · ${p.default_model}` : ""}
          </option>
        ))}
      </Select>
      <ModeBadge mode={value === "mock" ? "simulated" : "real-model"} />
      {status === "no-backend" && (
        <span className="text-[11px] text-muted-foreground">
          Real calls need the backend — see <Link href="/settings" className="text-primary hover:underline">Settings</Link>.
        </span>
      )}
      {status === "offline" && <span className="text-[11px] text-warning">Backend configured but unreachable.</span>}
      {status === "ready" && available.length === 0 && <span className="text-[11px] text-muted-foreground">Backend has no provider API keys configured.</span>}
    </div>
  );
}
