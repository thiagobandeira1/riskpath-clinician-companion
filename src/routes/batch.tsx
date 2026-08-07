import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Info,
  Play,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";

import { api, ApiCallError } from "@/lib/api";
import type {
  BatchPredictionResponse,
  Explanation,
  FeatureMeta,
  Metadata,
  PatientFeatures,
} from "@/lib/types";
import { useLocalStorage } from "@/lib/storage";
import { getChapterLabel, getLabel } from "@/lib/featureLabels";
import { bandForProbability } from "@/lib/riskBands";
import { CarePathwayCard } from "@/components/care-pathway";
import { cn } from "@/lib/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/batch")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Batch Score — RiskPath" },
      {
        name: "description",
        content:
          "Upload a CSV of patients, score the full batch in a single XGBoost forward pass, and export the results with risk-band coloring.",
      },
    ],
  }),
  component: BatchPage,
});

// ---------- helpers ----------

interface ParsedRow {
  features: PatientFeatures;
  rowNum: number; // 1-indexed including header
}

interface ValidationError {
  row: number | "—";
  column: string;
  issue: string;
  current: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function coerceNumeric(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t.toLowerCase() === "null" || t === "NA" || t === "NaN") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function coerceCategorical(raw: string): string | null {
  const t = raw.trim();
  if (t === "" || t.toLowerCase() === "null") return null;
  return t;
}

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ---------- mini SHAP waterfall for expanded row ----------

function MiniShap({ explanation }: { explanation: Explanation }) {
  const data = explanation.shap_values
    .map((s, i) => ({
      name: explanation.feature_names[i],
      shap: s,
      value: explanation.feature_values_transformed[i],
    }))
    .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap))
    .slice(0, 5)
    .reverse();
  const maxAbs = Math.max(0.0001, ...data.map((d) => Math.abs(d.shap)));
  return (
    <div className="h-[220px] -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
            stroke="currentColor"
            className="text-muted-foreground"
            domain={[-maxAbs, maxAbs]}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={200}
            tick={(props: { x: number; y: number; payload: { value: string } }) => {
              const { x, y, payload } = props;
              const { primary, technical } = getLabel(payload.value);
              return (
                <g transform={`translate(${x},${y})`}>
                  <text x={-6} y={-4} textAnchor="end" className="fill-foreground" style={{ fontSize: 11, fontWeight: 500 }}>
                    {primary}
                  </text>
                  <text x={-6} y={9} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 9, fontFamily: "JetBrains Mono" }}>
                    {technical}
                  </text>
                </g>
              );
            }}
            stroke="currentColor"
            interval={0}
          />
          <ReferenceLine x={0} stroke="currentColor" className="text-border" />
          <RTooltip
            cursor={{ fill: "rgba(127,127,127,0.08)" }}
            content={((props: { active?: boolean; payload?: Array<{ payload: { name: string; shap: number; value: number | null } }> }) => {
              const { active, payload } = props;
              if (!active || !payload || !payload.length) return null;
              const d = payload[0].payload;
              const { primary, technical } = getLabel(d.name);
              const label =
                d.shap >= 0
                  ? `Increased risk by ${Math.abs(d.shap).toFixed(4)} log-odds`
                  : `Decreased risk by ${Math.abs(d.shap).toFixed(4)} log-odds`;
              return (
                <div className="rounded-md border bg-popover/95 backdrop-blur-sm text-popover-foreground shadow-md px-3 py-2 text-xs">
                  <div className="font-medium">{primary}</div>
                  <div className="font-mono text-[10px] text-muted-foreground mb-1">{technical}</div>
                  <div>{label}</div>
                  <div className="text-muted-foreground mt-0.5">value: {d.value === null ? "missing" : d.value}</div>
                </div>
              );
            }) as never}
          />
          <Bar dataKey="shap" radius={[3, 3, 3, 3]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.shap >= 0 ? "oklch(0.645 0.246 16.439)" : "oklch(0.696 0.17 162.48)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- expanded row ----------

function ExpandedRow({
  features,
  probability,
  colSpan,
}: {
  features: PatientFeatures;
  probability: number;
  colSpan: number;
}) {
  const key = useMemo(() => JSON.stringify(features), [features]);
  const { data, isLoading } = useQuery({
    queryKey: ["batch-explain", key],
    queryFn: () => api.explain(features),
    staleTime: Infinity,
  });
  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colSpan} className="p-6">
        {isLoading || !data ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Top 5 risk drivers for this patient
              </div>
              <MiniShap explanation={data} />
            </div>
            <CarePathwayCard probability={probability} />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

// ---------- main page ----------

type SortKey = "idx" | "chapter" | "discharge" | "drg" | "probability";
type SortDir = "asc" | "desc";

function BatchPage() {
  const queryClient = useQueryClient();
  const [defaultThreshold] = useLocalStorage("riskpath.defaultThreshold", 0.5);
  const [threshold, setThreshold] = useState<number>(defaultThreshold);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [results, setResults] = useState<BatchPredictionResponse | null>(null);
  const [fallbackDismissed, setFallbackDismissed] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("probability");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const { data: metadata } = useQuery({
    queryKey: ["metadata"],
    queryFn: () => api.getMetadata(),
    staleTime: Infinity,
  });

  const featureNames = useMemo<string[]>(
    () => metadata?.features.map((f) => f.name) ?? [],
    [metadata],
  );
  const featureByName = useMemo<Map<string, FeatureMeta>>(() => {
    const m = new Map<string, FeatureMeta>();
    metadata?.features.forEach((f) => m.set(f.name, f));
    return m;
  }, [metadata]);

  // ----- parse + validate -----
  const handleFile = useCallback(
    (f: File) => {
      setFile(f);
      setResults(null);
      setExpanded(new Set());
      setErrors([]);
      setWarnings([]);
      setParsedRows([]);
      if (!metadata) {
        setErrors([{ row: "—", column: "—", issue: "Metadata not loaded yet — try again in a moment.", current: "" }]);
        return;
      }

      Papa.parse<Record<string, string>>(f, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (res) => {
          const errs: ValidationError[] = [];
          const warns: string[] = [];

          const headers = res.meta.fields ?? [];
          const headerSet = new Set(headers);
          const expectedSet = new Set(featureNames);
          const missing = featureNames.filter((n) => !headerSet.has(n));
          const extras = headers.filter((h) => !expectedSet.has(h));

          if (missing.length > 0) {
            errs.push({
              row: "—",
              column: missing.slice(0, 5).join(", ") + (missing.length > 5 ? `, …(+${missing.length - 5} more)` : ""),
              issue: `Missing required V7 feature column${missing.length > 1 ? "s" : ""}`,
              current: "—",
            });
          }
          if (extras.length > 0) {
            warns.push(`${extras.length} extra column${extras.length > 1 ? "s" : ""} ignored: ${extras.slice(0, 5).join(", ")}${extras.length > 5 ? "…" : ""}`);
          }

          const rows = res.data;
          if (rows.length === 0) {
            errs.push({ row: "—", column: "—", issue: "CSV contains no data rows.", current: "" });
          }
          if (rows.length > 100) {
            errs.push({
              row: "—",
              column: "—",
              issue: `Max 100 patients per batch (got ${rows.length}). Please split the file.`,
              current: String(rows.length),
            });
          }

          const parsed: ParsedRow[] = [];
          if (missing.length === 0 && rows.length > 0 && rows.length <= 100) {
            rows.forEach((row, i) => {
              const features: PatientFeatures = {};
              featureNames.forEach((name) => {
                const cell = row[name] ?? "";
                const meta = featureByName.get(name);
                if (!meta) return;
                if (meta.type === "numeric") {
                  const v = coerceNumeric(cell);
                  if (cell.trim() !== "" && v === null && !["null", "na", "nan"].includes(cell.trim().toLowerCase())) {
                    errs.push({
                      row: i + 2,
                      column: name,
                      issue: "Not a valid number",
                      current: cell,
                    });
                  }
                  features[name] = v;
                } else {
                  const v = coerceCategorical(cell);
                  if (v !== null && !meta.levels.includes(v)) {
                    errs.push({
                      row: i + 2,
                      column: name,
                      issue: `Value not in allowed levels (${meta.levels.slice(0, 4).join(", ")}${meta.levels.length > 4 ? "…" : ""})`,
                      current: v,
                    });
                  }
                  features[name] = v;
                }
              });
              parsed.push({ features, rowNum: i + 2 });
            });
          }

          setParsedRows(parsed);
          setErrors(errs);
          setWarnings(warns);
        },
        error: (err: Error) => {
          setErrors([{ row: "—", column: "—", issue: `CSV parse error: ${err.message}`, current: "" }]);
        },
      });
    },
    [metadata, featureNames, featureByName],
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) handleFile(accepted[0]);
    },
    [handleFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.ms-excel": [".csv"] },
    multiple: false,
  });

  const clearFile = () => {
    setFile(null);
    setParsedRows([]);
    setErrors([]);
    setWarnings([]);
    setResults(null);
    setExpanded(new Set());
  };

  // ----- score mutation -----
  const scoreMutation = useMutation({
    mutationFn: () =>
      api.predictBatch(
        parsedRows.map((r) => r.features),
        threshold,
      ),
    onSuccess: (data) => {
      setResults(data);
      setExpanded(new Set());
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiCallError) {
        toast.error(`${err.envelope.error.code}: ${err.envelope.error.message}`);
      } else {
        toast.error("Scoring failed. Verify the backend is reachable.");
      }
    },
  });

  const canScore =
    !!file && parsedRows.length > 0 && errors.length === 0 && !scoreMutation.isPending;

  // ----- results derived -----
  const decoratedResults = useMemo(() => {
    if (!results) return [];
    return results.results.map((r, i) => {
      const features = parsedRows[i]?.features ?? {};
      return {
        idx: i + 1,
        probability: r.probability,
        prediction: (r.probability >= threshold ? 1 : 0) as 0 | 1,
        chapter: features.primary_dx_chapter as string | null,
        discharge: features.discharge_location as string | null,
        drg: features.drg_code as string | null,
        features,
      };
    });
  }, [results, parsedRows, threshold]);

  const sortedResults = useMemo(() => {
    const arr = [...decoratedResults];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "idx":
          cmp = a.idx - b.idx;
          break;
        case "probability":
          cmp = a.probability - b.probability;
          break;
        case "chapter":
          cmp = String(a.chapter ?? "").localeCompare(String(b.chapter ?? ""));
          break;
        case "discharge":
          cmp = String(a.discharge ?? "").localeCompare(String(b.discharge ?? ""));
          break;
        case "drg":
          cmp = String(a.drg ?? "").localeCompare(String(b.drg ?? ""));
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [decoratedResults, sortKey, sortDir]);

  const summary = useMemo(() => {
    if (!decoratedResults.length) return null;
    const probs = decoratedResults.map((r) => r.probability);
    const flagged = decoratedResults.filter((r) => r.prediction === 1).length;
    const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
    const sorted = [...probs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return { n: probs.length, flagged, mean, median };
  }, [decoratedResults]);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(k === "probability" ? "desc" : "asc");
    }
  };

  // ----- export results -----
  const exportResults = () => {
    if (!results) return;
    const headers = ["#", "probability", "prediction", ...featureNames];
    const lines = [headers.join(",")];
    decoratedResults.forEach((r) => {
      const row: (string | number | null)[] = [
        r.idx,
        r.probability.toFixed(6),
        r.prediction,
        ...featureNames.map((n) => r.features[n] ?? null),
      ];
      lines.push(row.map(csvEscape).join(","));
    });
    triggerDownload(lines.join("\n"), "riskpath_batch_results.csv");
  };

  // ----- template download -----
  const downloadTemplate = async () => {
    if (!metadata) {
      toast.error("Metadata not loaded yet.");
      return;
    }
    try {
      const ex = await queryClient.fetchQuery({
        queryKey: ["examples", 5],
        queryFn: () => api.getExamples(5),
        staleTime: Infinity,
      });
      const headers = featureNames;
      const lines = [headers.join(",")];
      ex.examples.slice(0, 5).forEach((p) => {
        lines.push(headers.map((n) => csvEscape(p.features[n] as string | number | null)).join(","));
      });
      triggerDownload(lines.join("\n"), "riskpath_batch_template.csv");
    } catch {
      toast.error("Could not load template examples.");
    }
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter leading-tight">Batch Score</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Upload a CSV of patients, score the full batch in a single XGBoost forward pass, and
            export the results with risk-band coloring.
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} className="shrink-0">
          <Download className="h-4 w-4 mr-2" />
          Download CSV Template
        </Button>
      </div>

      {/* upload zone */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                "flex flex-col items-center justify-center text-center py-12 px-4 rounded-md cursor-pointer transition-colors",
                isDragActive ? "bg-accent/60" : "hover:bg-accent/30",
              )}
            >
              <input {...getInputProps()} />
              <UploadCloud className="h-12 w-12 text-slate-400 mb-3" strokeWidth={1.5} />
              <p className="text-base font-medium">Drop a CSV here, or click to browse</p>
              <p className="text-sm text-slate-500 mt-1.5 max-w-md">
                1–100 patient rows. Headers must match the 50 V7 feature names. Numeric cells
                accept blank for missing data.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatBytes(file.size)} ·{" "}
                  {parsedRows.length > 0
                    ? `${parsedRows.length} patient${parsedRows.length === 1 ? "" : "s"}`
                    : "parsing…"}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                <X className="h-4 w-4 mr-1.5" />
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>{errors.length} validation error{errors.length === 1 ? "" : "s"} blocking score</AlertTitle>
          <AlertDescription>
            <div className="mt-3 max-h-64 overflow-auto rounded border bg-background/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row #</TableHead>
                    <TableHead>Column</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Current value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.slice(0, 50).map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono tabular-nums">{e.row}</TableCell>
                      <TableCell className="font-mono text-xs">{e.column}</TableCell>
                      <TableCell className="text-xs">{e.issue}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]">{e.current}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {errors.length === 0 && warnings.length > 0 && (
        <Alert className="border-amber-500/40 text-amber-700 dark:text-amber-300">
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-1 text-sm">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* score button */}
      <div>
        <Button size="lg" disabled={!canScore} onClick={() => scoreMutation.mutate()}>
          <Play className="h-4 w-4 mr-2" />
          {scoreMutation.isPending
            ? `Scoring ${parsedRows.length} patients…`
            : `Score Batch${parsedRows.length ? ` (${parsedRows.length})` : ""}`}
        </Button>
        {scoreMutation.isError && (
          <Button variant="outline" className="ml-3" onClick={() => scoreMutation.mutate()}>
            Retry
          </Button>
        )}
      </div>

      {/* empty helper */}
      {!file && (
        <Card>
          <CardContent className="p-4 flex items-start gap-3 text-sm">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Need a sample? Click <span className="font-medium text-foreground">"Download CSV Template"</span> at top to get a 5-patient template with the correct columns.
            </p>
          </CardContent>
        </Card>
      )}

      {/* model fallback notice */}
      {results && results.fallback_warnings.length > 0 && !fallbackDismissed && (
        <FallbackNotice
          warnings={results.fallback_warnings}
          onDismiss={() => setFallbackDismissed(true)}
        />
      )}

      {/* results */}
      {results && summary && (
        <div ref={resultsRef}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Results
              </CardTitle>
              <Button variant="outline" size="sm" onClick={exportResults}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export Results
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* threshold */}
              <div className="rounded-md border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Classification threshold
                  </label>
                  <span className="font-mono tabular-nums text-sm">{threshold.toFixed(2)}</span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[threshold]}
                  onValueChange={(v) => setThreshold(v[0])}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Reclassifies risk client-side from returned probabilities — no API call.
                </p>
              </div>

              {/* summary tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Tile value={summary.n.toString()} label="Patients scored" />
                <Tile value={summary.flagged.toString()} label="Flagged at-risk" highlight />
                <Tile value={summary.mean.toFixed(3)} label="Mean probability" />
                <Tile value={summary.median.toFixed(3)} label="Median probability" />
              </div>

              {/* table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead label="#" k="idx" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-14" />
                      <SortHead label="Diagnosis Chapter" k="chapter" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHead label="Discharge Location" k="discharge" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHead label="DRG" k="drg" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHead label="Probability" k="probability" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <TableHead>Risk</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedResults.map((r) => {
                      const band = bandForProbability(r.probability, metadata?.risk_bands);
                      const isExpanded = expanded.has(r.idx);
                      const toggle = () => {
                        const next = new Set(expanded);
                        if (next.has(r.idx)) next.delete(r.idx);
                        else next.add(r.idx);
                        setExpanded(next);
                      };
                      return [
                        <TableRow
                          key={`row-${r.idx}`}
                          onClick={toggle}
                          className={cn("cursor-pointer", band.rowTintClass, "hover:bg-accent/30")}
                        >
                          <TableCell className="font-mono tabular-nums text-xs">{r.idx}</TableCell>
                          <TableCell className="text-sm">{getChapterLabel(r.chapter)}</TableCell>
                          <TableCell className="text-sm">{r.discharge ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{r.drg ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{r.probability.toFixed(3)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("border", band.badgeClass)}>
                              {band.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                        </TableRow>,
                        isExpanded ? (
                          <ExpandedRow
                            key={`exp-${r.idx}`}
                            features={r.features}
                            probability={r.probability}
                            colSpan={7}
                          />
                        ) : null,
                      ];
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Tile({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className="rounded-md border p-3">
      <div className={cn("text-2xl font-mono tabular-nums font-semibold", highlight && "text-rose-500")}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function SortHead({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === k;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 text-xs uppercase tracking-wider font-semibold",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        {active && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </TableHead>
  );
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
