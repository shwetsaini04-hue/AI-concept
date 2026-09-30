"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map as MapIcon,
  Network,
  GitBranch,
  Database,
  Code2,
  BookMarked,
  AlertTriangle,
  Repeat,
  Trophy,
  Settings,
  Search,
  Menu,
  X,
  Moon,
  Sun,
  ChevronDown,
  FlaskConical,
  CheckCircle2,
  Circle,
  CircleDot,
} from "lucide-react";
import { MODULES, lessonsByModule } from "@/content/modules";
import { useHydrated, useProgress } from "@/lib/store/progress";
import { allMastery, dueReviews } from "@/lib/mastery";
import { Kbd, Switch, Tip } from "@/components/ui/primitives";
import { SearchDialog } from "./SearchDialog";
import { SyncProvider } from "./SyncProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Learning Path", icon: MapIcon },
  { href: "/system", label: "System View", icon: Network },
  { href: "/decisions", label: "Decision Frameworks", icon: GitBranch },
  { href: "/dataset", label: "Transcript Dataset", icon: Database },
  { href: "/playground", label: "Python Playground", icon: Code2 },
  { href: "/glossary", label: "Glossary", icon: BookMarked },
];

const PRACTICE = [
  { href: "/mistakes", label: "Mistakes", icon: AlertTriangle },
  { href: "/review", label: "Spaced Review", icon: Repeat, badge: "due" as const },
  { href: "/capstone", label: "Capstone", icon: Trophy },
  { href: "/settings", label: "Settings & Data", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const theme = useProgress((s) => s.settings.theme);
  const socratic = useProgress((s) => s.settings.socratic);
  const setSetting = useProgress((s) => s.setSetting);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, hydrated]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <SyncProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 shrink-0 border-r bg-card transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar pathname={pathname} onClose={() => setMobileOpen(false)} />
        </aside>
        {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur">
            <button className="rounded-md p-1.5 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-full max-w-md cursor-pointer items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground hover:bg-muted"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search lessons, concepts, glossary, mistakes…</span>
              <span className="hidden sm:inline">
                <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>
              </span>
            </button>
            <div className="ml-auto flex items-center gap-3">
              <Tip content="Socratic mode: when you answer wrong you get a hint and a second attempt before the explanation is revealed.">
                <span>
                  <Switch checked={hydrated && socratic} onChange={(v) => setSetting("socratic", v)} label={<span className="hidden text-xs font-medium sm:inline">Socratic mode</span>} />
                </span>
              </Tip>
              <button
                className="rounded-md p-2 hover:bg-muted"
                aria-label="Toggle dark mode"
                onClick={() => setSetting("theme", theme === "dark" ? "light" : "dark")}
              >
                {hydrated && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </SyncProvider>
  );
}

function Sidebar({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const hydrated = useHydrated();
  const lessons = useProgress((s) => s.lessons);
  const reviews = useProgress((s) => s.reviews);
  const mastery = hydrated ? allMastery({ lessons, reviews }) : {};
  const due = hydrated ? dueReviews(reviews).length : 0;
  const activeModule = MODULES.find((m) => lessonsByModule(m.id).some((l) => pathname === `/learn/${l.slug}`))?.id;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FlaskConical className="h-4 w-4" />
          </span>
          Transcript AI Lab
        </Link>
        <button className="ml-auto rounded-md p-1 hover:bg-muted lg:hidden" onClick={onClose} aria-label="Close navigation">
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 text-sm">
        <div className="space-y-0.5">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} active={pathname === n.href} icon={n.icon} label={n.label} />
          ))}
        </div>

        <div>
          <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Modules</div>
          <div className="space-y-1">
            {MODULES.map((m) => {
              const isOpen = open[m.id] ?? m.id === activeModule;
              return (
                <div key={m.id}>
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [m.id]: !isOpen }))}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium hover:bg-muted"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-muted font-mono text-[11px]">{m.number}</span>
                    <span className="flex-1 truncate">{m.short}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-2">
                      {lessonsByModule(m.id).map((l) => {
                        const st = mastery[l.slug]?.status ?? "not-started";
                        const Icon = st === "mastered" || st === "completed" ? CheckCircle2 : st === "learning" ? CircleDot : Circle;
                        const active = pathname === `/learn/${l.slug}`;
                        return (
                          <Link
                            key={l.slug}
                            href={`/learn/${l.slug}`}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-1 text-[13px] hover:bg-muted",
                              active ? "bg-primary-soft font-medium text-primary" : "text-foreground/80",
                            )}
                          >
                            <Icon className={cn("h-3.5 w-3.5 shrink-0", st === "mastered" ? "text-success" : st === "completed" ? "text-primary" : st === "learning" ? "text-warning" : "text-muted-foreground/60")} />
                            <span className="truncate">{l.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Practice</div>
          <div className="space-y-0.5">
            {PRACTICE.map((n) => (
              <NavLink key={n.href} href={n.href} active={pathname === n.href} icon={n.icon} label={n.label} badge={n.badge === "due" && due > 0 ? due : undefined} />
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}

function NavLink({ href, active, icon: Icon, label, badge }: { href: string; active: boolean; icon: typeof LayoutDashboard; label: string; badge?: number }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted", active ? "bg-primary-soft font-medium text-primary" : "text-foreground/85")}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && <span className="rounded-full bg-warning px-1.5 text-[10px] font-semibold text-white">{badge}</span>}
    </Link>
  );
}
