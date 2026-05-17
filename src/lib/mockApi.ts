// Self-contained mock backend for RiskPath. Activated only when
// VITE_USE_MOCK_API=true. Never used as silent fallback when the real
// backend errors. All values are obviously synthetic ("…-MOCK" suffix).

import type {
  ExamplesResponse,
  Explanation,
  FeatureMeta,
  HealthResponse,
  Metadata,
  Patient,
  PatientFeatures,
  Prediction,
} from "./types";

const CATEGORICAL_FEATURES: { name: string; levels: string[] }[] = [
  {
    name: "discharge_location",
    levels: ["Home", "Home Health Care", "Skilled Nursing Facility", "Rehab", "Hospice", "Against Medical Advice"],
  },
  {
    name: "drg_code",
    levels: ["291", "292", "293", "470", "871", "872", "885", "194", "190", "189"],
  },
  {
    name: "primary_dx_chapter",
    levels: ["Circulatory", "Respiratory", "Endocrine", "Renal", "Infectious", "Neoplasms", "Mental", "Digestive"],
  },
  {
    name: "insurance_type",
    levels: ["Medicare", "Medicaid", "Private", "Self-pay", "Other"],
  },
];

const NUMERIC_FEATURES: { name: string; min: number; median: number; max: number }[] = [
  { name: "age", min: 18, median: 67, max: 102 },
  { name: "length_of_stay_days", min: 1, median: 5, max: 60 },
  { name: "prior_admissions_6m", min: 0, median: 0, max: 12 },
  { name: "prior_admissions_12m", min: 0, median: 1, max: 18 },
  { name: "time_since_last_discharge_days", min: 0, median: 180, max: 3650 },
  { name: "num_diagnoses", min: 1, median: 8, max: 35 },
  { name: "num_procedures", min: 0, median: 2, max: 25 },
  { name: "num_medications_at_discharge", min: 0, median: 9, max: 40 },
  { name: "charlson_score", min: 0, median: 3, max: 18 },
  { name: "elixhauser_score", min: 0, median: 4, max: 22 },
  { name: "sodium_meq_l", min: 115, median: 138, max: 160 },
  { name: "potassium_meq_l", min: 2.5, median: 4.1, max: 7.5 },
  { name: "creatinine_mg_dl", min: 0.3, median: 1.0, max: 12 },
  { name: "bun_mg_dl", min: 3, median: 18, max: 150 },
  { name: "glucose_mg_dl", min: 30, median: 118, max: 600 },
  { name: "hemoglobin_g_dl", min: 5, median: 12.5, max: 19 },
  { name: "wbc_k_ul", min: 0.5, median: 8.2, max: 45 },
  { name: "platelets_k_ul", min: 10, median: 220, max: 900 },
  { name: "albumin_g_dl", min: 1.0, median: 3.5, max: 5.5 },
  { name: "bilirubin_mg_dl", min: 0.1, median: 0.7, max: 30 },
  { name: "alt_u_l", min: 5, median: 25, max: 2000 },
  { name: "ast_u_l", min: 5, median: 27, max: 2000 },
  { name: "alk_phos_u_l", min: 20, median: 95, max: 1200 },
  { name: "troponin_ng_ml", min: 0, median: 0.02, max: 25 },
  { name: "bnp_pg_ml", min: 0, median: 110, max: 9000 },
  { name: "lactate_mmol_l", min: 0.3, median: 1.4, max: 18 },
  { name: "inr", min: 0.8, median: 1.1, max: 12 },
  { name: "ptt_sec", min: 20, median: 32, max: 200 },
  { name: "heart_rate_mean_bpm", min: 35, median: 82, max: 180 },
  { name: "heart_rate_max_bpm", min: 50, median: 105, max: 220 },
  { name: "systolic_bp_mean_mmhg", min: 60, median: 128, max: 220 },
  { name: "systolic_bp_min_mmhg", min: 40, median: 105, max: 200 },
  { name: "diastolic_bp_mean_mmhg", min: 30, median: 72, max: 140 },
  { name: "respiratory_rate_mean", min: 8, median: 18, max: 45 },
  { name: "spo2_mean_pct", min: 70, median: 96, max: 100 },
  { name: "temperature_max_c", min: 34, median: 37.2, max: 41.5 },
  { name: "weight_kg", min: 35, median: 78, max: 220 },
  { name: "bmi", min: 14, median: 28, max: 65 },
  { name: "ed_visits_6m", min: 0, median: 1, max: 25 },
  { name: "ed_visits_12m", min: 0, median: 2, max: 40 },
  { name: "icu_days", min: 0, median: 0, max: 45 },
  { name: "days_in_hospital_12m", min: 0, median: 6, max: 180 },
  { name: "num_specialists_seen_12m", min: 0, median: 3, max: 25 },
  { name: "missed_appointments_6m", min: 0, median: 0, max: 20 },
  { name: "social_risk_score", min: 0, median: 2, max: 10 },
  { name: "outpatient_visits_6m", min: 0, median: 3, max: 50 },
];

const FEATURES: FeatureMeta[] = [
  ...CATEGORICAL_FEATURES.map(
    (f): FeatureMeta => ({
      name: f.name,
      type: "categorical",
      levels: f.levels,
      pct_nan: 0.02,
    }),
  ),
  ...NUMERIC_FEATURES.map(
    (f): FeatureMeta => ({
      name: f.name,
      type: "numeric",
      min: f.min,
      median: f.median,
      max: f.max,
      pct_nan: Math.round(Math.random() * 15) / 100,
    }),
  ),
];

const METADATA: Metadata = {
  features: FEATURES,
  model_info: {
    name: "xgboost-v7-seed0-MOCK",
    seed: 0,
    n_features: FEATURES.length,
    published_test_auroc: 0.7929,
    deployed_test_auroc: 0.7935,
  },
  default_threshold: 0.5,
};

// Deterministic pseudo-random for stable mock outputs
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function makePatient(targetProb: number, seed: number): Patient {
  const rng = seeded(seed);
  const features: PatientFeatures = {};
  for (const f of FEATURES) {
    if (f.type === "categorical") {
      features[f.name] = f.levels[Math.floor(rng() * f.levels.length)];
    } else {
      // Higher-risk patients trend toward worse vitals/more admits
      const skew = targetProb;
      const lo = f.min;
      const hi = f.max;
      const med = f.median;
      const t = rng();
      const base = t < 0.5 ? lo + (med - lo) * (t * 2) : med + (hi - med) * ((t - 0.5) * 2);
      const skewed = base + (hi - med) * skew * (rng() - 0.3) * 0.4;
      const val = Math.max(lo, Math.min(hi, skewed));
      features[f.name] = Number(val.toFixed(2));
      if (rng() < 0.04) features[f.name] = null;
    }
  }
  // Force a recognizable spread on a couple of fields
  features.prior_admissions_6m = Math.round(targetProb * 8);
  features.ed_visits_12m = Math.round(targetProb * 12);
  features.length_of_stay_days = Math.max(1, Math.round(2 + targetProb * 14));
  features.time_since_last_discharge_days = Math.round(365 * (1 - targetProb) + 5);
  return { id: `mock-${seed}`, features };
}

const EXAMPLE_PROBS = [0.08, 0.27, 0.48, 0.71, 0.91];
const EXAMPLES: Patient[] = EXAMPLE_PROBS.map((p, i) => makePatient(p, 1000 + i));

function logit(p: number) {
  const eps = 1e-6;
  const q = Math.max(eps, Math.min(1 - eps, p));
  return Math.log(q / (1 - q));
}
function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

// Compute a deterministic probability from a patient by hashing some signal fields
function probabilityFor(features: PatientFeatures): number {
  const num = (v: FeatureValue, fallback: number) =>
    typeof v === "number" && !Number.isNaN(v) ? v : fallback;
  const score =
    0.18 * num(features.prior_admissions_6m, 0) +
    0.07 * num(features.ed_visits_12m, 0) +
    0.04 * num(features.charlson_score, 3) +
    0.015 * num(features.length_of_stay_days, 5) +
    0.012 * num(features.num_medications_at_discharge, 9) -
    0.003 * num(features.albumin_g_dl, 3.5) * 4 -
    0.0008 * num(features.time_since_last_discharge_days, 180) +
    (features.discharge_location === "Skilled Nursing Facility" ? 0.35 : 0) +
    (features.discharge_location === "Against Medical Advice" ? 0.55 : 0) +
    (features.primary_dx_chapter === "Circulatory" ? 0.15 : 0) +
    (features.primary_dx_chapter === "Renal" ? 0.25 : 0);
  return sigmoid(score - 1.2);
}

function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

export const mockApi = {
  async getMetadata(): Promise<Metadata> {
    return delay(METADATA, 180);
  },
  async getHealth(): Promise<HealthResponse> {
    return delay({ status: "ok", model: "xgboost-v7-seed0-MOCK" }, 80);
  },
  async getExamples(_n = 5): Promise<ExamplesResponse> {
    return delay({ examples: EXAMPLES, n: EXAMPLES.length }, 220);
  },
  async predict(features: PatientFeatures, threshold: number): Promise<Prediction> {
    const probability = probabilityFor(features);
    const warnings: string[] = [];
    const nulls = Object.values(features).filter((v) => v === null).length;
    if (nulls > 8) warnings.push(`${nulls} numeric fields are missing — imputed with cohort medians.`);
    return delay(
      {
        probability,
        prediction: probability >= threshold ? 1 : 0,
        threshold,
        model_name: "xgboost-v7-seed0-MOCK",
        fallback_warnings: warnings,
      },
      260,
    );
  },
  async explain(features: PatientFeatures): Promise<Explanation> {
    const probability = probabilityFor(features);
    const baseValue = logit(0.18); // cohort base rate ~18%
    const targetLogit = logit(probability);
    const totalShap = targetLogit - baseValue;

    // Generate raw shap-like contributions proportional to a per-feature signal
    const raw: number[] = FEATURES.map((f) => {
      const v = features[f.name];
      if (f.type === "categorical") {
        const isHighRisk =
          (f.name === "discharge_location" && (v === "Skilled Nursing Facility" || v === "Against Medical Advice")) ||
          (f.name === "primary_dx_chapter" && (v === "Renal" || v === "Circulatory"));
        return isHighRisk ? 0.6 : -0.1;
      }
      const num = typeof v === "number" ? v : f.median;
      const norm = (num - f.median) / Math.max(1e-6, f.max - f.min);
      // direction: most worse-when-higher; albumin & spo2 worse-when-lower
      const inverted = ["albumin_g_dl", "spo2_mean_pct", "hemoglobin_g_dl", "time_since_last_discharge_days"].includes(
        f.name,
      );
      return (inverted ? -norm : norm) * (0.4 + Math.abs(norm));
    });

    // Rescale so sum(shap) ≈ totalShap (additivity)
    const sumRaw = raw.reduce((a, b) => a + b, 0) || 1;
    const scale = totalShap / sumRaw;
    const shap_values = raw.map((r) => Number((r * scale).toFixed(6)));

    return delay(
      {
        shap_values,
        base_value: Number(baseValue.toFixed(6)),
        feature_names: FEATURES.map((f) => f.name),
        feature_values_transformed: FEATURES.map((f) => {
          const v = features[f.name];
          if (v === null || v === undefined) return null;
          if (typeof v === "number") return v;
          // categorical -> level index
          if (f.type === "categorical") return f.levels.indexOf(v);
          return null;
        }),
        probability,
        model_name: "xgboost-v7-seed0-MOCK",
        fallback_warnings: [],
      },
      320,
    );
  },
};
