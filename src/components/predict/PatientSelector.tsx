import { RefreshCw, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Patient } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getChapterLabel } from "@/lib/featureLabels";

interface Props {
  patients: Patient[] | undefined;
  selectedIndex: number | null;
  onSelect: (i: number) => void;
  onRefresh: () => void;
  loading: boolean;
}

function fmtRelative(v: unknown): string {
  if (typeof v !== "number") return "—";
  if (v < 1) return "today";
  if (v === 1) return "1 day ago";
  if (v < 30) return `${Math.round(v)} days ago`;
  if (v < 60) return "1 month ago";
  if (v < 365) return `${Math.round(v / 30)} months ago`;
  const years = v / 365;
  if (years < 1.5) return "1 year ago";
  return `${years.toFixed(1)} years ago`;
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
                  <Skeleton key={i} className="h-[140px] w-[240px] shrink-0 rounded-xl" />
                ))
              : patients?.map((p, i) => {
                  const active = selectedIndex === i;
                  const drg = p.features.drg_code;
                  const chapter = getChapterLabel(
                    p.features.primary_dx_chapter as string | null | undefined,
                  );
                  return (
                    <button
                      key={p.id ?? i}
                      onClick={() => onSelect(i)}
                      className={cn(
                        "shrink-0 w-[240px] min-h-[140px] text-left p-5 rounded-xl border bg-card flex flex-col gap-4 transition-all duration-150",
                        "hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-indigo-500/30",
                        active
                          ? "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60"
                          : "border-border",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">
                          #{i + 1}
                        </div>
                        {drg != null && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                            DRG {String(drg)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="text-sm font-semibold truncate text-foreground">
                          {chapter}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {String(p.features.discharge_location ?? "—")}
                          </span>
                        </div>
                      </div>
                      <div className="mt-auto text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {fmtRelative(p.features.time_since_last_discharge)}
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
