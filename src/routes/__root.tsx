import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { useTheme } from "@/components/theme-provider";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <AppShell openPalette={() => {}}>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <Compass className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">Route not found.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The URL you tried doesn't match any RiskPath module.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link to="/predict">Back to Predict</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <AppShell openPalette={() => {}}>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => reset()}>Try again</Button>
            <Button variant="outline" asChild>
              <Link to="/predict">Back to Predict</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RiskPath — Clinical Risk Console" },
      { name: "description", content: "Map every patient's risk pathway, explained. RiskPath surfaces 30-day readmission risk with SHAP-level transparency." },
      { property: "og:title", content: "RiskPath — Clinical Risk Console" },
      { property: "og:description", content: "Map every patient's risk pathway, explained." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemedApp />
    </QueryClientProvider>
  );
}

function ThemedApp() {
  // initialise theme on every mount
  useTheme();
  const palette = useCommandPalette();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Hide shell on 404 paths handled by notFoundComponent (root provides own shell there)
  return (
    <>
      <AppShell openPalette={() => palette.setOpen(true)}>
        <div key={pathname} className="animate-in fade-in duration-150">
          <Outlet />
        </div>
      </AppShell>
      <CommandPalette open={palette.open} setOpen={palette.setOpen} />
      <Toaster position="bottom-right" richColors />
    </>
  );
}
