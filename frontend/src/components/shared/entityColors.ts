import type { EntityType } from "@/content/dataset";

export const ENTITY_COLOR: Record<EntityType, string> = {
  PERSON: "bg-pink-100 text-pink-900 ring-pink-300 dark:bg-pink-900/40 dark:text-pink-100",
  BANK: "bg-blue-100 text-blue-900 ring-blue-300 dark:bg-blue-900/40 dark:text-blue-100",
  LOAN: "bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100",
  AMOUNT: "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-100",
  RATE: "bg-orange-100 text-orange-900 ring-orange-300 dark:bg-orange-900/40 dark:text-orange-100",
  DATE: "bg-violet-100 text-violet-900 ring-violet-300 dark:bg-violet-900/40 dark:text-violet-100",
  LOCATION: "bg-cyan-100 text-cyan-900 ring-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-100",
  PRODUCT: "bg-lime-100 text-lime-900 ring-lime-300 dark:bg-lime-900/40 dark:text-lime-100",
  TENURE: "bg-fuchsia-100 text-fuchsia-900 ring-fuchsia-300 dark:bg-fuchsia-900/40 dark:text-fuchsia-100",
  EMPLOYMENT: "bg-teal-100 text-teal-900 ring-teal-300 dark:bg-teal-900/40 dark:text-teal-100",
};
