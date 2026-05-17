import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Database,
  ChevronDown,
  ChevronRight,
  Printer,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getLabel } from "@/lib/featureLabels";

export const Route = createFileRoute("/model")({
  head: () => ({
    meta: [
      { title: "Model Card — RiskPath" },
      {
        name: "description",
        content:
          "Methodology, performance, intended use, and limitations of the deployed readmission risk model.",
      },
    ],
  }),
  component: ModelPage,
});

const TOP_FEATURES: Array<{ name: string; importance: number }> = [
  { name: "los_trend_180d", importance: 120_000 },
  { name: "los_trend_x_prior_admits", importance: 58_000 },
  { name: "freq_x_recency", importance: 55_000 },
  { name: "discharge_location_te", importance: 51_000 },
  { name: "log_n_labs", importance: 42_000 },
  { name: "n_emar_details", importance: 38_000 },
  { name: "prior_admits_x_age", importance: 35_000 },
  { name: "drg_code_te", importance: 32_000 },
  { name: "severity_x_lab_abnormal", importance: 29_000 },
  { name: "max_unit_los_days", importance: 27_000 },
];

const CALIBRATION = [
  { predicted: 0.05, observed: 0.06 },
  { predicted: 0.15, observed: 0.14 },
  { predicted: 0.25, observed: 0.22 },
  { predicted: 0.35, observed: 0.31 },
  { predicted: 0.45, observed: 0.43 },
  { predicted: 0.55, observed: 0.56 },
  { predicted: 0.65, observed: 0.68 },
  { predicted: 0.75, observed: 0.79 },
  { predicted: 0.85, observed: 0.87 },
  { predicted: 0.95, observed: 0.93 },
];

function ModelPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["metadata"],
    queryFn: () => api.getMetadata(),
    staleTime: Infinity,
  });

  const info = data?.model_info;
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const importanceData = useMemo(
    () =>
      [...TOP_FEATURES]
        .reverse() // recharts vertical = bottom up; reverse so #1 is on top
        .map((f) => ({ name: getLabel(f.name).primary, importance: f.importance })),
    [],
  );

  return (
    <div className="print-page space-y-8 max-w-5xl mx-auto">
      {/* [1] Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter leading-tight">Model Card</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Methodology, performance, intended use, and limitations of the deployed
            readmission risk model.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="print:hidden"
        >
          <FileText className="h-4 w-4 mr-1.5" />
          Export to PDF
          <Printer className="h-3.5 w-3.5 ml-1.5 opacity-60" />
        </Button>
      </div>

      {/* [2] Hero */}
      <Card>
        <CardContent className="p-6">
          {isLoading || !info ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Skeleton className="h-24 md:col-span-1" />
              <Skeleton className="h-24 md:col-span-4" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
              <div className="md:col-span-1 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Deployed Model
                </div>
                <div className="font-mono text-base font-semibold break-all leading-snug">
                  {info.name}
                </div>
                <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                  DEPLOYED
                </Badge>
              </div>
              <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricTile
                  value={info.deployed_test_auroc.toFixed(4)}
                  label="Validation AUROC (seed-0)"
                />
                <MetricTile
                  value={info.published_test_auroc.toFixed(4)}
                  label="Published AUROC (10-seed avg)"
                />
                <MetricTile value={String(info.n_features)} label="Features" />
                <MetricTile value={String(info.seed)} label="Random seed" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* [3] Methodology */}
      <Section icon={<FileText className="h-4 w-4" />} title="Methodology">
        <DefList>
          <DefRow term="Architecture">
            Gradient-boosted decision trees (XGBoost). Single-seed deployment for
            serving; published headline is the 10-seed average.
          </DefRow>
          <DefRow term="Training data">
            MIMIC-IV v3.1 (PhysioNet credentialed access). 244,576 admissions.
            Patient-grouped 80/20 train-test split with a 10% inner validation slice
            for early stopping.
          </DefRow>
          <DefRow term="Feature engineering">
            50 V7 engineered features (4 categorical, 46 numeric). Categories include
            length-of-stay trends, order patterns, comorbidities, lab abnormalities,
            prior-utilization counts, and interaction terms (signaled by{" "}
            <code className="font-mono text-xs">x</code> in the feature name).
          </DefRow>
        </DefList>
      </Section>

      {/* [4] Performance */}
      <Section icon={<Activity className="h-4 w-4" />} title="Performance">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <ul className="space-y-2.5">
              <PerfRow label="AUROC — validation (seed-0)" value="0.7929" />
              <PerfRow label="AUROC — published (10-seed avg)" value="0.7935" />
              <PerfRow label="Test set size" value="49,191" />
              <PerfRow label="5-fold CV stdev" value="±0.003" />
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Top 10 Features by Importance (Gain)
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={importanceData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                >
                  <CartesianGrid stroke="currentColor" className="text-border" strokeDasharray="2 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                    stroke="currentColor"
                    className="text-muted-foreground"
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    className="text-foreground"
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(127,127,127,0.08)" }}
                    content={((props: { active?: boolean; payload?: Array<{ payload: { name: string; importance: number } }> }) => {
                      const { active, payload } = props;
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-md border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs">
                          <div className="font-medium">{d.name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                            gain: {d.importance.toLocaleString()}
                          </div>
                        </div>
                      );
                    }) as never}
                  />
                  <Bar dataKey="importance" radius={[3, 3, 3, 3]}>
                    {importanceData.map((_, i) => (
                      <Cell key={i} fill="oklch(0.585 0.233 277.117)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Calibration (Predicted vs Observed)
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={CALIBRATION}
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="currentColor" className="text-border" strokeDasharray="2 3" />
                <XAxis
                  type="number"
                  dataKey="predicted"
                  domain={[0, 1]}
                  ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
                  tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  label={{ value: "Predicted probability", position: "insideBottom", offset: -2, style: { fontSize: 11, fill: "currentColor" } }}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
                  tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  label={{ value: "Observed rate", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "currentColor" } }}
                />
                <Tooltip
                  content={((props: { active?: boolean; payload?: Array<{ payload: { predicted: number; observed: number } }> }) => {
                    const { active, payload } = props;
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-md border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs font-mono">
                        <div>predicted: {d.predicted.toFixed(2)}</div>
                        <div>observed: {d.observed.toFixed(2)}</div>
                      </div>
                    );
                  }) as never}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="oklch(0.708 0 0)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  name="Ideal"
                />
                <Line
                  type="monotone"
                  dataKey="observed"
                  stroke="oklch(0.585 0.233 277.117)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Observed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs italic text-slate-500 mt-2">
            Calibration is a synthetic illustration. Real calibration data requires a
            backend endpoint not yet exposed.
          </p>
        </div>
      </Section>

      {/* [5] Intended Use */}
      <Section icon={<ShieldCheck className="h-4 w-4" />} title="Intended Use">
        <BulletList>
          <li>
            <strong>Decision SUPPORT only.</strong> The model surfaces risk signals;
            clinicians make discharge decisions.
          </li>
          <li>
            Designed for adults discharged from acute inpatient stays. Not validated
            for pediatric, obstetric, or ED-discharge populations.
          </li>
          <li>
            Threshold is tunable. Default 0.50 was selected for balanced
            sensitivity/specificity; clinical workflows may prefer a lower threshold
            to maximize catch rate at the cost of more false positives.
          </li>
          <li>
            Re-prediction encouraged: edit any feature in the Predict module to
            explore counterfactual interventions.
          </li>
        </BulletList>
      </Section>

      {/* [6] Limitations */}
      <Section
        icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        title="Limitations"
      >
        <BulletList>
          <li>
            Trained on MIMIC-IV (single-academic-medical-center cohort). External
            validity to other health systems is unknown.
          </li>
          <li>
            Does not incorporate post-discharge variables (home environment,
            caregiver support, medication adherence).
          </li>
          <li>
            Race and ethnicity are encoded via target encoding{" "}
            (<code className="font-mono text-xs">race_te</code>). Use the model with
            awareness that historical care disparities may be reflected in training
            data.
          </li>
          <li>
            Predicted probabilities are calibrated for training-time prevalence;
            site-level recalibration recommended before clinical deployment.
          </li>
        </BulletList>
      </Section>

      {/* [7] Provenance — collapsible */}
      <CollapsibleSection
        icon={<Database className="h-4 w-4" />}
        title="Data Provenance & Ethics"
      >
        <BulletList>
          <li>MIMIC-IV v3.1 from PhysioNet.</li>
          <li>
            Distribution: PhysioNet Credentialed Health Data Use Agreement.
          </li>
          <li>
            Constraints: data must not be redistributed (no upload to GitHub, no
            cloud storage without DUA).
          </li>
          <li>
            Ethical considerations: the model surfaces patterns that may reflect
            historical disparities in care access. Use as augmentation to clinical
            judgment, never replacement.
          </li>
        </BulletList>
      </CollapsibleSection>

      {/* [8] Footer */}
      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 border-t">
        <span>Card generated {today}</span>
        {info && (
          <span className="font-mono">model: {info.name}</span>
        )}
        <Link
          to="/predict"
          className="ml-auto text-primary hover:underline print:hidden"
        >
          ← Back to Predict
        </Link>
      </div>
    </div>
  );
}

function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono font-semibold tabular-nums text-[32px] leading-none">
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="print-break">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 text-sm leading-relaxed">{children}</CardContent>
    </Card>
  );
}

function CollapsibleSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-6 py-4 text-left hover:bg-accent/40 rounded-xl transition-colors"
        aria-expanded={open}
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-semibold flex-1">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <CardContent className="p-6 pt-0 text-sm leading-relaxed">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

function DefList({ children }: { children: React.ReactNode }) {
  return <dl className="space-y-4">{children}</dl>;
}

function DefRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-6">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">
        {term}
      </dt>
      <dd className="text-foreground/90">{children}</dd>
    </div>
  );
}

function BulletList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc pl-5 space-y-2 marker:text-muted-foreground text-foreground/90">
      {children}
    </ul>
  );
}

function PerfRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold tabular-nums text-base">{value}</span>
    </li>
  );
}
