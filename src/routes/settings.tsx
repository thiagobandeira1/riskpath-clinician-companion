import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useLocalStorage } from "@/lib/storage";
import { useHealth } from "@/components/use-health";
import { API_BASE_URL, APP_VERSION, BUILD_SHA, MODEL_IDENTIFIER, USE_MOCK_API } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RiskPath" },
      { name: "description", content: "Appearance, prediction defaults, and connection settings for RiskPath." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [defaultThreshold, setDefaultThreshold] = useLocalStorage("riskpath.defaultThreshold", 0.5);
  const [autoExplain, setAutoExplain] = useLocalStorage("riskpath.autoExplain", false);
  const health = useHealth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Personal preferences and connection details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="mb-2 block">Theme</Label>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={theme === t ? "default" : "outline"}
                onClick={() => setTheme(t)}
                className="capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prediction Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="mb-2 block">
              Default threshold <span className="font-mono text-muted-foreground">{defaultThreshold.toFixed(2)}</span>
            </Label>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[defaultThreshold]}
              onValueChange={(v) => setDefaultThreshold(v[0] ?? 0.5)}
              className="max-w-sm"
            />
          </div>
          <div className="flex items-center justify-between max-w-sm">
            <div>
              <Label>Auto-explain on edits</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recompute SHAP after every edit. Off by default to save compute.
              </p>
            </div>
            <Switch checked={autoExplain} onCheckedChange={setAutoExplain} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="block mb-1">API base URL</Label>
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded inline-block">
              {API_BASE_URL}
            </code>
            {USE_MOCK_API && (
              <span className="ml-2 text-xs font-mono text-amber-600">(mock mode active)</span>
            )}
          </div>
          <div>
            <Label className="block mb-1.5">Service health · last 10 polls</Label>
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => {
                const h = health.history[i];
                return (
                  <div
                    key={i}
                    className={cn(
                      "h-3 w-3 rounded-full border",
                      h === undefined
                        ? "bg-muted border-border"
                        : h
                          ? "bg-emerald-500 border-emerald-600"
                          : "bg-rose-500 border-rose-600",
                    )}
                    title={h === undefined ? "no data" : h ? "ok" : "fail"}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-mono">{APP_VERSION}</dd>
            <dt className="text-muted-foreground">Build SHA</dt>
            <dd className="font-mono">{BUILD_SHA}</dd>
            <dt className="text-muted-foreground">Model</dt>
            <dd className="font-mono">{MODEL_IDENTIFIER}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
