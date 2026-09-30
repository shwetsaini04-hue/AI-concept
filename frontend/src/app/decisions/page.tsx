"use client";

import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { DECISION_TREES } from "@/content/decisions";
import { DecisionTree } from "@/components/shared/DecisionTree";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export default function DecisionsPage() {
  const [active, setActive] = useState(DECISION_TREES[0].id);
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (DECISION_TREES.some((t) => t.id === h)) setActive(h);
  }, []);
  const tree = DECISION_TREES.find((t) => t.id === active)!;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Decision frameworks</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Interactive decision trees for the architecture questions you'll face repeatedly. Each branch explains <i>why</i> the question matters — the goal is to internalize the reasoning, not memorize verdicts.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <nav className="space-y-1">
          {DECISION_TREES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActive(t.id);
                history.replaceState(null, "", `#${t.id}`);
              }}
              className={cn("flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted", active === t.id && "bg-primary-soft font-medium text-primary")}
            >
              <GitBranch className="h-4 w-4 shrink-0" />
              {t.title}
            </button>
          ))}
        </nav>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{tree.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{tree.description}</p>
          </CardHeader>
          <CardContent>
            <DecisionTree key={tree.id} tree={tree} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
