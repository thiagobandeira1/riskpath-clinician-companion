import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLabel } from "@/lib/featureLabels";
import {
  calibrationByDecile,
  computeMetricsAt,
  getInsightsCohort,
  histogram10,
  thresholdSweep,
} from "@/lib/mockInsights";

export const Route = createFileRoute("/insights")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Insights — RiskPath" },
      {
        name: "description",
        content:
          "Population-level analytics: threshold-sensitivity, calibration, and feature-importance across the cohort.",
      },
    ],
  }),
  component: InsightsPage,
});

function bandColor(p: number): string {
  if (p < 0.3) return "oklch(0.696 0.17 162.48)"; // emerald-500
  if (p < 0.7) return "oklch(0.769 0.188 70.08)"; // amber-500
  return "oklch(0.645 0.246 16.439)"; // rose-500
}

const INDIGO = "oklch(0.585 0.233 277.117)";
const EMERALD = "oklch(0.696 0.17 162.48)";
const AMBER = "oklch(0.769 0.188 70.08)";
const ROSE = "oklch(0.645 0.246 16.439)";

function PopoverTip({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string | number;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-md border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs">
      {label !== undefined && <div className="font-medium mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          {p.color && <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />}
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono tabular-nums">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function InsightsPage() {
  const cohort = useMemo(() => getInsightsCohort(), []);
  const [threshold, setThreshold] = useState(0.5);
  const [showFeatDist, setShowFeatDist] = useState(false);

  const probs = useMemo(() => cohort.patients.map((p) => p.probability), [cohort]);
  const meanProb = useMemo(
    () => probs.reduce((a, b) => a + b, 0) / probs.length,
    [probs],
  );
  const flagged = useMemo(
    () => cohort.patients.filter((p) => p.probability >= threshold).length,
    [cohort, threshold],
  );

  const histogram = useMemo(() => histogram10(probs), [probs]);
  const sweep = useMemo(() => thresholdSweep(cohort.patients), [cohort]);
  const currentMetrics = useMemo(
    () => computeMetricsAt(cohort.patients, threshold),
    [cohort, threshold],
  );
  const calibration = useMemo(() => calibrationByDecile(cohort.patients), [cohort]);

  const topDrivers = useMemo(() => cohort.meanAbsShap.slice(0, 10), [cohort]);

  return (
    <div className="space-y-8">
      {/* header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Population Insights</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Aggregate patterns across 100 simulated scored patients. Threshold-sensitivity,
          calibration, and feature-importance views.
        </p>
        <p className="text-xs text-slate-500 italic mt-2 max-w-2xl">
          All metrics here are computed from a synthetic mock cohort. Real population insights
          require batch-scoring real patients via the Batch Score module.
        </p>
      </div>

      {/* hero metrics */}
      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
          <Hero value="100" label="Patients in cohort" />
          <Hero
            value={flagged.toString()}
            label={`Flagged at-risk at threshold ${threshold.toFixed(2)}`}
            accent
          />
          <Hero value={meanProb.toFixed(2)} label="Mean predicted probability" />
          <Hero value={cohort.cohortAuroc.toFixed(4)} label="Cohort AUROC (synthetic)" />
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <SectionCard icon={BarChart3} title="Risk Distribution">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogram} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="bin" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="currentColor" className="text-muted-foreground" allowDecimals={false} />
              <RTooltip content={((p: unknown) => <PopoverTip {...(p as Parameters<typeof PopoverTip>[0])} />) as never} cursor={{ fill: "rgba(127,127,127,0.08)" }} />
              <ReferenceLine x={`${(Math.floor(threshold * 10) / 10).toFixed(1)}–${((Math.floor(threshold * 10) + 1) / 10).toFixed(1)}`} stroke="currentColor" className="text-foreground" strokeDasharray="4 4" />
              <Bar dataKey="count" name="Patients">
                {histogram.map((b, i) => (
                  <Cell key={i} fill={bandColor((b.low + b.high) / 2)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 rounded-md border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Threshold
            </label>
            <span className="font-mono tabular-nums text-sm">{threshold.toFixed(2)}</span>
          </div>
          <Slider min={0} max={1} step={0.01} value={[threshold]} onValueChange={(v) => setThreshold(v[0])} />
        </div>
      </SectionCard>

      {/* Top Drivers */}
      <SectionCard icon={Sparkles} title="Top Population Drivers">
        <div className="h-[420px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...topDrivers].reverse()} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                stroke="currentColor"
                className="text-muted-foreground"
                label={{ value: "Mean |SHAP| value (log-odds)", position: "insideBottom", offset: -8, style: { fontSize: 11, fill: "currentColor" } }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={220}
                interval={0}
                stroke="currentColor"
                tick={(props: { x: number; y: number; payload: { value: string } }) => {
                  const { x, y, payload } = props;
                  const { primary, technical } = getLabel(payload.value);
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-6} y={-4} textAnchor="end" className="fill-foreground" style={{ fontSize: 11, fontWeight: 500 }}>{primary}</text>
                      <text x={-6} y={9} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 9, fontFamily: "JetBrains Mono" }}>{technical}</text>
                    </g>
                  );
                }}
              />
              <RTooltip
                content={((p: unknown) => <PopoverTip {...(p as Parameters<typeof PopoverTip>[0])} formatter={(v) => v.toFixed(4)} />) as never}
                cursor={{ fill: "rgba(127,127,127,0.08)" }}
              />
              <Bar dataKey="value" name="Mean |SHAP|" fill={INDIGO} radius={[3, 3, 3, 3]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 mt-3 max-w-3xl">
          Drivers ranked by their average absolute contribution to predicted risk across the cohort.
          A high value means this feature consistently moves predictions (either up or down).
        </p>
      </SectionCard>

      {/* Threshold Sensitivity */}
      <SectionCard icon={Target} title="Threshold Sensitivity">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sweep} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="threshold"
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                stroke="currentColor"
                className="text-muted-foreground"
                tickFormatter={(v) => Number(v).toFixed(1)}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                stroke="currentColor"
                className="text-muted-foreground"
                domain={[0, 1]}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <RTooltip
                content={((p: unknown) => <PopoverTip {...(p as Parameters<typeof PopoverTip>[0])} formatter={(v) => v.toFixed(3)} />) as never}
                cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
              />
              <ReferenceLine x={Math.round(threshold * 10) / 10} stroke="currentColor" className="text-foreground" strokeDasharray="4 4" />
              <Line dataKey="sensitivity" name="Sensitivity" stroke={ROSE} strokeWidth={2} dot={{ r: 2 }} />
              <Line dataKey="specificity" name="Specificity" stroke={EMERALD} strokeWidth={2} dot={{ r: 2 }} />
              <Line dataKey="ppv" name="PPV" stroke={INDIGO} strokeWidth={2} dot={{ r: 2 }} />
              <Line dataKey="npv" name="NPV" stroke={AMBER} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <Def term="Sensitivity" def="Of patients who actually readmitted, what % did the model correctly flag?" color={ROSE} />
          <Def term="Specificity" def="Of patients who did not readmit, what % did the model correctly clear?" color={EMERALD} />
          <Def term="PPV" def="Of flagged patients, what % actually readmitted?" color={INDIGO} />
          <Def term="NPV" def="Of cleared patients, what % truly didn't readmit?" color={AMBER} />
        </dl>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <MiniTile label="Sensitivity" value={currentMetrics.sensitivity} color={ROSE} />
          <MiniTile label="Specificity" value={currentMetrics.specificity} color={EMERALD} />
          <MiniTile label="PPV" value={currentMetrics.ppv} color={INDIGO} />
          <MiniTile label="NPV" value={currentMetrics.npv} color={AMBER} />
        </div>
      </SectionCard>

      {/* Calibration */}
      <SectionCard icon={Activity} title="Calibration Curve">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={calibration} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="decile"
                type="number"
                domain={[0, 1]}
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                stroke="currentColor"
                tickFormatter={(v) => v.toFixed(1)}
                label={{ value: "Predicted probability decile", position: "insideBottom", offset: -4, style: { fontSize: 11, fill: "currentColor" } }}
              />
              <YAxis
                domain={[0, 1]}
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                stroke="currentColor"
                tickFormatter={(v) => v.toFixed(1)}
              />
              <RTooltip
                content={((p: unknown) => <PopoverTip {...(p as Parameters<typeof PopoverTip>[0])} formatter={(v) => v.toFixed(3)} />) as never}
                cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
              />
              <Line
                data={[{ decile: 0, perfect: 0 }, { decile: 1, perfect: 1 }]}
                dataKey="perfect"
                name="Perfect calibration"
                stroke="oklch(0.704 0.04 256.788)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="observed"
                name="Observed readmission rate"
                stroke={INDIGO}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 italic mt-3">
          Computed from the synthetic mock cohort. A well-calibrated model has its observed line
          hugging the diagonal.
        </p>
      </SectionCard>

      {/* Feature distributions */}
      <Card>
        <CardHeader className="pb-2">
          <button
            type="button"
            onClick={() => setShowFeatDist((v) => !v)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Feature Distributions
              </CardTitle>
            </div>
            {showFeatDist ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          <p className="text-xs text-slate-500 mt-2">
            Distribution of each numeric feature across the cohort. Useful for spotting outliers
            and data drift.
          </p>
        </CardHeader>
        {showFeatDist && (
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cohort.distributions.map((d) => (
                <FeatureSpark key={d.name} name={d.name} values={d.values} />
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ---------- subcomponents ----------

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-2">{children}</CardContent>
    </Card>
  );
}

function Hero({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={cn("text-3xl font-mono tabular-nums font-semibold", accent && "text-rose-500")}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Def({ term, def, color }: { term: string; def: string; color: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="inline-block w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
      <div>
        <dt className="font-medium inline">{term}: </dt>
        <dd className="text-muted-foreground inline">{def}</dd>
      </div>
    </div>
  );
}

function MiniTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      <div className="text-xl font-mono tabular-nums mt-1">{value.toFixed(2)}</div>
    </div>
  );
}

function FeatureSpark({ name, values }: { name: string; values: number[] }) {
  const data = useMemo(() => {
    // 12-bucket histogram
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const bins = Array.from({ length: 12 }, (_, i) => ({ x: i, count: 0 }));
    values.forEach((v) => {
      const idx = Math.min(11, Math.floor(((v - min) / span) * 12));
      bins[idx].count++;
    });
    return bins;
  }, [values]);
  const { primary, technical } = getLabel(name);
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs font-medium leading-tight truncate" title={primary}>{primary}</div>
      <div className="text-[9px] font-mono text-muted-foreground truncate" title={technical}>{technical}</div>
      <div className="h-[40px] mt-1.5 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <Area type="monotone" dataKey="count" stroke={INDIGO} fill={INDIGO} fillOpacity={0.2} strokeWidth={1.5} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Silence unused-import warnings for components only rendered conditionally
void Button;
