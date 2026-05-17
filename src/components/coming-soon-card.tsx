import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  icon: LucideIcon;
  title: string;
  body: string;
  preview?: "table" | "chart";
}

export function ComingSoonCard({ icon: Icon, title, body, preview }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="pt-8 pb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="secondary">Coming soon</Badge>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">{body}</p>

          {preview === "table" && (
            <div className="mt-8 rounded-lg border bg-muted/30 p-4 opacity-50 select-none">
              <div className="grid grid-cols-5 gap-2 text-[10px] font-mono uppercase text-muted-foreground mb-2">
                <div>patient_id</div>
                <div>probability</div>
                <div>band</div>
                <div>top driver</div>
                <div>action</div>
              </div>
              {[0.12, 0.34, 0.58, 0.74, 0.89].map((p, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 text-xs py-1.5 border-t border-border/50">
                  <div className="font-mono">pt_{1000 + i}</div>
                  <div className="font-mono">{p.toFixed(3)}</div>
                  <div>
                    <span
                      className={
                        "px-1.5 py-0.5 rounded text-[10px] font-mono " +
                        (p > 0.66
                          ? "bg-rose-100 text-rose-900"
                          : p > 0.33
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-900")
                      }
                    >
                      {p > 0.66 ? "high" : p > 0.33 ? "med" : "low"}
                    </span>
                  </div>
                  <div className="font-mono truncate text-muted-foreground">prior_admissions_6m</div>
                  <div className="text-muted-foreground">—</div>
                </div>
              ))}
            </div>
          )}

          {preview === "chart" && (
            <div className="mt-8 rounded-lg border bg-muted/30 p-4 opacity-50 select-none h-48 flex items-end justify-around gap-2">
              {[0.4, 0.62, 0.88, 0.55, 0.72, 0.45, 0.91, 0.38, 0.6, 0.78, 0.5, 0.65].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-primary/70"
                  style={{ height: `${h * 100}%` }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
