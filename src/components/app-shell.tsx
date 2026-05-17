import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Target,
  LayoutGrid,
  BarChart3,
  ScrollText,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Logo, Wordmark } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocalStorage } from "@/lib/storage";
import { useTheme } from "@/components/theme-provider";
import { useHealth } from "@/components/use-health";
import { APP_VERSION, BUILD_SHA, MODEL_IDENTIFIER } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_MODULE = [
  { to: "/predict", label: "Predict", icon: Target, soon: false },
  { to: "/batch", label: "Batch Score", icon: LayoutGrid, soon: false },
  { to: "/insights", label: "Insights", icon: BarChart3, soon: false },
  { to: "/model", label: "Model Card", icon: ScrollText, soon: false },
] as const;

const ROUTE_LABELS: Record<string, string> = {
  "/predict": "Predict",
  "/batch": "Batch Score",
  "/insights": "Insights",
  "/model": "Model Card",
  "/settings": "Settings",
};

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useLocalStorage("riskpath.sidebar.collapsed", false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const health = useHealth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const moduleLabel = ROUTE_LABELS[pathname] ?? "Predict";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        {/* Top bar */}
        <header className="h-14 sticky top-0 z-30 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70 flex items-center px-4 gap-4">
          <Link to="/predict" className="flex items-center gap-2 shrink-0">
            <Logo size={28} />
            <Wordmark />
          </Link>
          <div className="hidden md:flex items-center text-sm text-muted-foreground">
            <span className="font-medium text-foreground/80">Readmission Risk</span>
            <span className="mx-2 opacity-50">›</span>
            <span>{moduleLabel}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border cursor-default",
                    health.online
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                      : "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      health.online ? "bg-emerald-500" : "bg-rose-500",
                    )}
                  />
                  {health.online ? "Online" : "Offline"}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Backend service is reachable. Polls GET /health every 10 seconds. Red dot means service unreachable.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="font-mono text-[10px] tracking-wider cursor-default">
                  DEV
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Development environment. Currently running on mock data. Toggle to live backend via VITE_API_BASE_URL + VITE_USE_MOCK_API.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark")
                  }
                  aria-label="Toggle theme"
                >
                  {!mounted ? (
                    <Monitor className="h-4 w-4 opacity-0" />
                  ) : theme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : theme === "light" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Theme: {theme}</TooltipContent>
            </Tooltip>
            <div
              className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center cursor-default select-none"
              aria-label="User"
            >
              TB
            </div>
          </div>
        </header>

        <div className="flex-1 flex">
          {/* Sidebar */}
          <aside
            className={cn(
              "border-r bg-card transition-[width] duration-150 ease-out shrink-0 hidden md:flex flex-col",
              collapsed ? "w-14" : "w-60",
            )}
          >
            <nav className="flex-1 py-4">
              <SidebarSection
                label="READMISSION RISK"
                collapsed={collapsed}
                items={NAV_MODULE}
                pathname={pathname}
              />
              <div className="mx-3 my-3 border-t" />
              <SidebarSection
                label="PLATFORM"
                collapsed={collapsed}
                items={[
                  { to: "/settings", label: "Settings", icon: SettingsIcon, soon: false } as const,
                ]}
                pathname={pathname}
              />
            </nav>
            <div className="p-2 border-t">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {collapsed ? "Expand sidebar" : "Collapse sidebar"}
                </TooltipContent>
              </Tooltip>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="max-w-7xl mx-auto p-6 lg:p-8">{children}</div>
          </main>
        </div>

        {/* Footer */}
        <footer className="h-10 border-t flex items-center px-4 text-xs text-muted-foreground bg-card">
          <span className="font-mono">
            RiskPath v{APP_VERSION} · build {BUILD_SHA} · model {MODEL_IDENTIFIER}
          </span>
          <div className="flex-1" />
          <span className="hidden sm:inline font-mono">
            Validation AUROC 0.7929 (10-seed avg: 0.7935)
          </span>
        </footer>
      </div>
    </TooltipProvider>
  );
}

function SidebarSection({
  label,
  collapsed,
  items,
  pathname,
}: {
  label: string;
  collapsed: boolean;
  items: ReadonlyArray<{ to: string; label: string; icon: React.ComponentType<{ className?: string }>; soon: boolean }>;
  pathname: string;
}) {
  return (
    <div>
      {!collapsed && (
        <div className="px-5 mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground">
          {label}
        </div>
      )}
      <ul className="px-2 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          const content = (
            <Link
              to={item.to}
              className={cn(
                "flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/80 hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.soon && (
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Soon
                    </span>
                  )}
                </>
              )}
            </Link>
          );
          return (
            <li key={item.to}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                    {item.soon ? " (soon)" : ""}
                  </TooltipContent>
                </Tooltip>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
