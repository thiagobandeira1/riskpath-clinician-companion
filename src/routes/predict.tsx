import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api, ApiCallError } from "@/lib/api";
import type { Explanation, PatientFeatures, Prediction } from "@/lib/types";
import { useLocalStorage } from "@/lib/storage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { ProbabilityGauge } from "@/components/predict/ProbabilityGauge";
import { ShapWaterfall } from "@/components/predict/ShapWaterfall";
import { PatientSelector } from "@/components/predict/PatientSelector";
import { FeatureEditor } from "@/components/predict/FeatureEditor";
import { CarePathwayCard } from "@/components/care-pathway";
import { useHealth } from "@/components/use-health";
import { boundariesFor, RISK_BANDS } from "@/lib/riskBands";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Predict — Readmission Risk · RiskPath" },
      {
        name: "description",
        content:
          "Estimate 30-day readmission risk for a single patient and inspect the SHAP drivers behind every prediction.",
      },
    ],
  }),
  component: PredictPage,
});

function PredictPage() {
  const queryClient = useQueryClient();
  const health = useHealth();
  const offline = !health.online;

  const [defaultThreshold] = useLocalStorage("riskpath.defaultThreshold", 0.5);
  const [threshold, setThreshold] = useState<number>(defaultThreshold);
  const [debouncedThreshold, setDebouncedThreshold] = useState<number>(defaultThreshold);
  const [selectedIndex, setSelectedIndex] = useLocalStorage<number | null>(
    "riskpath.lastPatientIndex",
    0,
  );
  const [values, setValues] = useState<PatientFeatures>({});
  const [baseline, setBaseline] = useState<PatientFeatures | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<string[]>([]);

  const { data: metadata, isLoading: metaLoading, error: metaError } = useQuery({
    queryKey: ["metadata"],
    queryFn: () => api.getMetadata(),
    staleTime: Infinity,
    retry: 1,
  });

  const { data: examples, isLoading: examplesLoading, refetch: refetchExamples } = useQuery({
    queryKey: ["examples", 5],
    queryFn: () => api.getExamples(5),
    staleTime: Infinity,
    enabled: !!metadata,
  });

  // Threshold debounce (200ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedThreshold(threshold), 200);
    return () => clearTimeout(t);
  }, [threshold]);

  // When patient list arrives, seed selection
  useEffect(() => {
    if (!examples?.examples?.length) return;
    const idx = selectedIndex == null || selectedIndex >= examples.examples.length ? 0 : selectedIndex;
    if (selectedIndex !== idx) setSelectedIndex(idx);
    const p = examples.examples[idx];
    if (p && Object.keys(values).length === 0) {
      setValues({ ...p.features });
      setBaseline({ ...p.features });
      setExplanation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examples]);


  function selectPatient(i: number) {
    if (!examples?.examples?.[i]) return;
    setSelectedIndex(i);
    const p = examples.examples[i];
    setValues({ ...p.features });
    setBaseline({ ...p.features });
    setExplanation(null);
  }

  // Predict mutation (called on edits, selection, threshold change)
  const predictMutation = useMutation({
    mutationFn: ({ f, t }: { f: PatientFeatures; t: number }) => api.predict(f, t),
    onSuccess: (data) => {
      setPrediction(data);
      setUpdatedAt(Date.now());
    },
    onError: (err: ApiCallError) => {
      const env = err.envelope.error;
      toast.error(env.code, { description: env.message });
    },
  });

  // Debounce predict on edits (350ms) and threshold (200ms applied via debouncedThreshold)
  const editDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!metadata || Object.keys(values).length === 0) return;
    if (offline) return;
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
    editDebounceRef.current = setTimeout(() => {
      predictMutation.mutate({ f: values, t: debouncedThreshold });
    }, 350);
    return () => {
      if (editDebounceRef.current) clearTimeout(editDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, debouncedThreshold, metadata, offline]);

  const explainMutation = useMutation({
    mutationFn: (f: PatientFeatures) => api.explain(f),
    onSuccess: (data) => {
      setExplanation(data);
    },
    onError: (err: ApiCallError) => {
      const env = err.envelope.error;
      toast.error(env.code, { description: env.message });
    },
  });

  const onChangeField = (name: string, value: string | number | null) => {
    setValues((v) => ({ ...v, [name]: value }));
  };
  const onResetFields = () => {
    if (baseline) setValues({ ...baseline });
  };

  // Keyboard shortcuts: R re-explain, E toggle editor (handled inside FeatureEditor open state — skip),
  // [ / ] prev/next sample
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        if (!offline) explainMutation.mutate(values);
      } else if (e.key === "[") {
        if (selectedIndex !== null && selectedIndex > 0) selectPatient(selectedIndex - 1);
      } else if (e.key === "]") {
        if (examples && selectedIndex !== null && selectedIndex < examples.examples.length - 1) {
          selectPatient(selectedIndex + 1);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, selectedIndex, examples, offline]);

  const allWarnings = useMemo(() => {
    const w: string[] = [];
    if (prediction?.fallback_warnings) w.push(...prediction.fallback_warnings);
    if (explanation?.fallback_warnings) w.push(...explanation.fallback_warnings);
    return Array.from(new Set(w)).filter((x) => !bannerDismissed.includes(x));
  }, [prediction, explanation, bannerDismissed]);

  if (metaError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Backend unreachable</AlertTitle>
          <AlertDescription>
            Cannot load model metadata. Verify the backend is running and that{" "}
            <code className="font-mono">VITE_API_BASE_URL</code> is correct.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module header */}
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter leading-tight">Readmission Prediction</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Estimate 30-day readmission risk for a single patient and inspect the drivers.
          </p>
        </div>
        <div className="flex items-center gap-4 min-w-[260px]">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Threshold
          </div>
          <div className="relative w-44">
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[threshold]}
              onValueChange={(v) => setThreshold(v[0] ?? 0.5)}
            />
            {/* band-boundary tick dots */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5">
              {boundariesFor(metadata?.risk_bands).map((b, i) => (
                <span
                  key={b}
                  className={`absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ring-1 ring-background ${RISK_BANDS[i + 1].bgClass}`}
                  style={{ left: `calc(${b * 100}% - 4px)` }}
                  aria-hidden
                />
              ))}
            </div>
          </div>
          <div className="font-mono text-sm tabular-nums w-12 text-right">
            {threshold.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Fallback warnings */}
      {allWarnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Model fallback notice</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-0.5 mt-1 text-sm">
              {allWarnings.map((w) => (
                <li key={w} className="flex items-start justify-between gap-3">
                  <span>{w}</span>
                  <button
                    onClick={() => setBannerDismissed((d) => [...d, w])}
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                  >
                    Dismiss
                  </button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Patient selector */}
      {metaLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <PatientSelector
          patients={examples?.examples}
          selectedIndex={selectedIndex}
          onSelect={selectPatient}
          onRefresh={() => refetchExamples()}
          loading={examplesLoading}
        />
      )}

      {/* Hero row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <ProbabilityGauge
            probability={prediction?.probability ?? null}
            updatedAt={updatedAt}
            loading={predictMutation.isPending}
            bands={metadata?.risk_bands}
          />
        </div>
        <div className="lg:col-span-7">
          <ShapWaterfall
            explanation={explanation}
            loading={explainMutation.isPending}
            onReexplain={() => explainMutation.mutate(values)}
            disabled={offline || !metadata}
          />
        </div>
      </div>

      {/* Care pathway */}
      <CarePathwayCard probability={prediction?.probability ?? null} bands={metadata?.risk_bands} />

      {/* Feature editor */}
      {metaLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : metadata ? (
        <FeatureEditor
          features={metadata.features}
          values={values}
          baseline={baseline}
          onChange={onChangeField}
          onReset={onResetFields}
        />
      ) : null}
    </div>
  );
}
