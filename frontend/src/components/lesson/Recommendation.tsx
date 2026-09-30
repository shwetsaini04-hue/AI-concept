"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import type { Recommendation } from "@/lib/recommend";
import { cn } from "@/lib/utils";

export function RecommendationCard({ rec, className }: { rec: Recommendation; className?: string }) {
  const tone = { success: "border-success/40", warning: "border-warning/40", info: "border-info/40" }[rec.tone];
  return (
    <div className={cn("rounded-lg border-l-4 border bg-card p-4", tone, className)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Compass className="h-4 w-4 text-primary" />
        {rec.headline}
      </div>
      {rec.detail && <p className="mt-1 text-sm text-muted-foreground">{rec.detail}</p>}
      {rec.actions.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recommended</div>
          <ul className="space-y-1">
            {rec.actions.map((a) => (
              <li key={a.href + a.label}>
                <Link href={a.href} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <ArrowRight className="h-3.5 w-3.5" />
                  {a.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
