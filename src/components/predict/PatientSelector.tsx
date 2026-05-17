import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Patient } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  patients: Patient[] | undefined;
  selectedIndex: number | null;
  onSelect: (i: number) => void;
  onRefresh: () => void;
  loading: boolean;
}

function fmtDays(v: unknown): string {
  if (typeof v !== "number") return "—";
  if (v < 1) return "today";
  if (v === 1) return "1 day ago";
  if (v < 30) return `${Math.round(v)} days ago`;
  if (v < 365) return `${Math.round(v / 30)} mo ago`;
  return `${(v / 365).toFixed(1)} yr ago`;
}

export function PatientSelector({ patients, selectedIndex, onSelect, onRefresh, loading }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sample Patients
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} aria-label="Refresh examples">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-3">
            {loading && !patients
              ? [0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-[100px] w-[200px] shrink-0 rounded-lg" />
                ))
              : patients?.map((p, i) => {
                  const active = selectedIndex === i;
                  return (
                    <button
                      key={p.id ?? i}
                      onClick={() => onSelect(i)}
                      className={cn(
                        "shrink-0 w-[210px] text-left p-3 rounded-lg border transition-colors",
                        active
                          ? "ring-2 ring-primary border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-border hover:bg-accent",
                      )}
                    >
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        Patient #{i + 1}
                      </div>
                      <div className="mt-1 text-sm font-medium truncate">
                        {String(p.features.primary_dx_chapter ?? "—")}
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div className="truncate">
                          <span className="font-mono">DRG</span>{" "}
                          {String(p.features.drg_code ?? "—")}
                        </div>
                        <div className="truncate">
                          → {String(p.features.discharge_location ?? "—")}
                        </div>
                        <div className="truncate">
                          last d/c {fmtDays(p.features.time_since_last_discharge_days)}
                        </div>
                      </div>
                    </button>
                  );
                })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
