import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FeatureMeta, PatientFeatures } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getLabel, getChapterLabel } from "@/lib/featureLabels";

interface Props {
  features: FeatureMeta[];
  values: PatientFeatures;
  baseline: PatientFeatures | null; // original values (for "edited" diff)
  onChange: (name: string, value: string | number | null) => void;
  onReset: () => void;
}

type TabKey = "all" | "categorical" | "numeric" | "edited";

export function FeatureEditor({ features, values, baseline, onChange, onReset }: Props) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");

  const editedSet = useMemo(() => {
    if (!baseline) return new Set<string>();
    const s = new Set<string>();
    for (const f of features) {
      const a = values[f.name];
      const b = baseline[f.name];
      if (a !== b) s.add(f.name);
    }
    return s;
  }, [values, baseline, features]);

  const counts = useMemo(() => {
    let cat = 0;
    let num = 0;
    for (const f of features) (f.type === "categorical" ? cat++ : num++);
    return { cat, num, edited: editedSet.size };
  }, [features, editedSet]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return features.filter((f) => {
      if (q) {
        const { primary } = getLabel(f.name);
        const hit =
          f.name.toLowerCase().includes(needle) ||
          primary.toLowerCase().includes(needle);
        if (!hit) return false;
      }
      if (tab === "categorical" && f.type !== "categorical") return false;
      if (tab === "numeric" && f.type !== "numeric") return false;
      if (tab === "edited" && !editedSet.has(f.name)) return false;
      return true;
    });
  }, [features, tab, q, editedSet]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 flex-wrap">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Patient Features ({features.length})
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(!open)} aria-label={open ? "Collapse" : "Expand"}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        {open && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search field…"
                className="h-8 pl-7 w-44 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={editedSet.size === 0}
              onClick={onReset}
            >
              Reset to original
            </Button>
          </div>
        )}
      </CardHeader>
      {open && (
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="categorical">Categorical ({counts.cat})</TabsTrigger>
              <TabsTrigger value="numeric">Numeric ({counts.num})</TabsTrigger>
              <TabsTrigger value="edited">Edited ({counts.edited})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((f) => {
              const edited = editedSet.has(f.name);
              const v = values[f.name];
              return (
                <div
                  key={f.name}
                  className={cn(
                    "rounded-md border p-2.5 transition-colors",
                    edited
                      ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
                      : "bg-background",
                  )}
                >
                  <label className="text-[11px] font-mono text-muted-foreground block mb-1.5 truncate" title={f.name}>
                    {f.name}
                  </label>
                  {f.type === "categorical" ? (
                    <Select
                      value={v === null || v === undefined ? "__null__" : String(v)}
                      onValueChange={(val) => onChange(f.name, val === "__null__" ? null : val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="(none)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__null__">(missing)</SelectItem>
                        {f.levels.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {lvl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="number"
                      step="any"
                      value={v === null || v === undefined ? "" : String(v)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        onChange(f.name, raw === "" ? null : Number(raw));
                      }}
                      placeholder={`median ${f.median} · [${f.min}, ${f.max}]`}
                      className="h-8 text-xs font-mono"
                    />
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
                No fields match.
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
