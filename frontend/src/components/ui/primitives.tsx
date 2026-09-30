"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/* ------------------------------ Button ------------------------------ */

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        secondary: "bg-muted text-foreground hover:bg-border/70",
        outline: "border border-input bg-card hover:bg-muted",
        ghost: "hover:bg-muted",
        danger: "bg-danger text-white hover:opacity-90",
        link: "text-primary underline-offset-4 hover:underline px-0",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";

/* ------------------------------- Card ------------------------------- */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border bg-card text-card-foreground", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold tracking-tight", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

/* ------------------------------- Badge ------------------------------ */

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", {
  variants: {
    variant: {
      default: "bg-primary-soft text-primary",
      muted: "bg-muted text-muted-foreground",
      outline: "border text-muted-foreground",
      success: "bg-success-soft text-success",
      warning: "bg-warning-soft text-warning",
      danger: "bg-danger-soft text-danger",
      info: "bg-info-soft text-info",
      agent: "bg-agent-soft text-agent",
      customer: "bg-customer-soft text-customer",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* ----------------------------- Progress ----------------------------- */

export function ProgressBar({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "success" | "warning" | "danger" }) {
  const color = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

/* ------------------------------ Inputs ------------------------------ */

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function Switch({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("inline-flex items-center gap-2 text-sm cursor-pointer", className)}
    >
      <span className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-input")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
      </span>
      {label}
    </button>
  );
}

/* ------------------------------ Slider ------------------------------ */

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-5 w-full touch-none select-none items-center", className)}
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange(v[0])}
      aria-label={ariaLabel}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        className="block h-4 w-4 rounded-full border-2 border-primary bg-card shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-grab"
      />
    </SliderPrimitive.Root>
  );
}

export function LabeledSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  format = (v: number) => String(v),
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="font-mono text-xs tabular-nums">{format(value)}</span>
      </div>
      <Slider value={value} onChange={onChange} min={min} max={max} step={step} aria-label={label} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ------------------------------- Tabs ------------------------------- */

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 focus-visible:outline-none", className)} {...props} />;
}

/* ------------------------------ Tooltip ----------------------------- */

export function Tip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content sideOffset={6} className="z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/* ------------------------------ Misc -------------------------------- */

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{children}</kbd>;
}

export function Stat({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-3", className)}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <div className="font-medium">{title}</div>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "success" | "danger" | "muted";
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-info/30 bg-info-soft",
    warning: "border-warning/30 bg-warning-soft",
    success: "border-success/30 bg-success-soft",
    danger: "border-danger/30 bg-danger-soft",
    muted: "bg-muted",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-3 text-sm", styles, className)}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div className="text-foreground/90">{children}</div>
    </div>
  );
}
