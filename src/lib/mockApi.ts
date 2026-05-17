// Self-contained mock backend for RiskPath. Activated only when
// VITE_USE_MOCK_API=true. Never used as silent fallback when the real
// backend errors. All values are obviously synthetic ("…-MOCK" suffix).

import type {
  ExamplesResponse,
  Explanation,
  FeatureMeta,
  FeatureValue,
  HealthResponse,
  Metadata,
  Patient,
  PatientFeatures,
  Prediction,
} from "./types";

const MODEL_NAME = "xgboost-v7-seed0-MOCK";

// --- Canonical V7 feature schema ----------------------------------------

const CATEGORICAL_FEATURES: { name: string; levels: string[] }[] = [
  {
    name: "drg_code",
    levels: ["189", "194", "291", "292", "293", "470", "603", "640", "871", "885", "Unknown"],
  },
  {
    name: "last_drg_dispo",
    levels: ["HOME_HOME", "HOME_HHA", "SNF_SNF", "TRANSFER_ACUTE", "HOSPICE", "DEATH", "UNK_UNK"],
  },
  {
    name: "discharge_location",
    levels: [
      "Home",
      "Home Health",
      "Skilled Nursing",
      "Rehab",
      "Hospice",
      "Acute Transfer",
      "Against Medical Advice",
      "Unknown",
    ],
  },
  {
    name: "primary_dx_chapter",
    levels: ["circ", "resp", "dig", "endo", "inj", "neop", "musc", "ment", "infe", "renal", "gu", "blood", "skin"],
  },
];

// [name, min, median, max, pct_nan%]
const NUMERIC_SPEC: [string, number, number, number, number][] = [
  ["los_trend_180d", -131, 0, 192, 29],
  ["drg_code_te", 0.065, 0.2, 0.66, 0],
  ["late_order_rate", 0, 0.11, 1, 1],
  ["primary_dx_chapter_te", 0.09, 0.21, 0.49, 0],
  ["prior_admits_6m_sq", 0, 0, 1089, 0],
  ["discharge_location_te", 0.001, 0.2, 0.51, 0],
  ["prior_admits_x_age", 0, 0, 1980, 0],
  ["prior_readmission_count", 0, 0, 51, 0],
  ["prior_admissions_6m", 0, 0, 33, 0],
  ["time_since_last_discharge", 0, 80, 5279, 0],
  ["renal_risk_x_age", 0, 0, 106, 0],
  ["freq_x_recency", 0, 0.009, 150, 0],
  ["high_risk_meds_x_age", 0, 79, 212, 0],
  ["orders_last_6h", 0, 0.92, 251, 2],
  ["last_drg_dispo_te", 0.08, 0.17, 0.59, 0],
  ["med_orders_ratio", 0, 0.45, 1, 1],
  ["los_trend_x_prior_6m", -170, 0, 192, 0],
  ["bmi_last", 12, 27.3, 79.8, 39],
  ["orders_first_24h", 0, 24, 50400, 1],
  ["prior_mean_los_6m", 0, 0, 308, 0],
  ["severity_x_readmit", 0, 0, 11.8, 0],
  ["severity_x_lab_abnormal", 0, 1.09, 15.75, 13],
  ["log_n_labs", 0, 4.43, 9.84, 12],
  ["max_unit_los_days", 0, 2.14, 169, 0],
  ["anemia_x_prior_admits", 0, 0, 18, 0],
  ["los_trend_x_prior_admits", -1197, 0, 1400, 0],
  ["log_prior_readmit_count", 0, 0, 3.95, 0],
  ["log_prior_admits_6m", 0, 0, 3.53, 0],
  ["nonenglish_x_prior_admits", 0, 0, 33, 0],
  ["log_time_since_discharge", 0, 4.4, 8.57, 0],
  ["los_x_n_diagnoses", 0, 34, 10780, 17],
  ["prior_admissions_all", 0, 1, 237, 0],
  ["new_med_rate_48h", 0, 4.25, 92, 11],
  ["clinical_complexity", -2.38, 3.82, 352, 0],
  ["los_per_prior_admit", 0, 1, 308, 17],
  ["discharge_surge", 0, 0, 1, 65],
  ["race_te", 0.06, 0.21, 0.26, 0],
  ["bilirubin_max", 0, 0, 82, 59],
  ["sodium_last", 82, 139, 184, 0],
  ["bp_diastolic_outpatient", 20, 70, 148, 39],
  ["comorbidity_pc4", -1.7, -0.09, 1.09, 0],
  ["n_emar_details", 0, 23, 36288, 44],
  ["iv_admin_rate", 0, 0, 1, 50],
  ["bun_creatinine_ratio", 0, 17.14, 272, 14],
  ["rapid_tfr_x_readmit", 0, 0, 9, 97],
  ["n_order_types", 0, 9, 15, 1],
];

const NUMERIC_FEATURES = NUMERIC_SPEC.map(([name, min, median, max, pct]) => ({
  name,
  min,
  median,
  max,
  pct_nan: pct / 100,
}));

// Canonical order: categoricals first (in given order), then numeric (in given order)
const FEATURES: FeatureMeta[] = [
  ...CATEGORICAL_FEATURES.map(
    (f): FeatureMeta => ({
      name: f.name,
      type: "categorical",
      levels: f.levels,
      pct_nan: 0.01,
    }),
  ),
  ...NUMERIC_FEATURES.map(
    (f): FeatureMeta => ({
      name: f.name,
      type: "numeric",
      min: f.min,
      median: f.median,
      max: f.max,
      pct_nan: f.pct_nan,
    }),
  ),
];

const METADATA: Metadata = {
  features: FEATURES,
  model_info: {
    name: MODEL_NAME,
    seed: 0,
    n_features: FEATURES.length,
    published_test_auroc: 0.7929,
    deployed_test_auroc: 0.7935,
  },
  default_threshold: 0.5,
};

// --- Utilities ----------------------------------------------------------

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function logit(p: number) {
  const eps = 1e-6;
  const q = Math.max(eps, Math.min(1 - eps, p));
  return Math.log(q / (1 - q));
}
function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

// Hash features -> deterministic [0,1)
function hashFeatures(features: PatientFeatures): number {
  let h = 2166136261 >>> 0;
  for (const k of Object.keys(features).sort()) {
    const v = String(features[k]);
    const s = `${k}=${v};`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
  }
  return (h >>> 0) / 0xffffffff;
}

// --- Example patient generation ----------------------------------------

function makePatient(targetProb: number, seed: number): Patient {
  const rng = seeded(seed);
  const features: PatientFeatures = {};
  for (const f of FEATURES) {
    if (f.type === "categorical") {
      if (rng() < f.pct_nan) {
        features[f.name] = null;
        continue;
      }
      // Risky patients pick from the high-risk side of each list (the canonical
      // levels are ordered roughly low→high risk for the relevant features).
      const skew = targetProb;
      const r = rng();
      const idx = Math.floor((r * 0.55 + skew * 0.45) * f.levels.length) % f.levels.length;
      features[f.name] = f.levels[idx];
    } else {
      if (rng() < f.pct_nan) {
        features[f.name] = null;
        continue;
      }
      const { min, median, max } = f;
      const t = rng();
      const base = t < 0.5 ? min + (median - min) * (t * 2) : median + (max - median) * ((t - 0.5) * 2);
      const skewed = base + (max - median) * targetProb * (rng() * 0.6 - 0.1);
      const val = Math.max(min, Math.min(max, skewed));
      const precision = max - min < 5 ? 4 : max - min < 100 ? 2 : 1;
      features[f.name] = Number(val.toFixed(precision));
    }
  }

  // Pin the target-encoded features to targetProb (clamped to each TE range),
  // so the deterministic probabilityFor lands close to targetProb.
  const clampTE = (lo: number, hi: number) => Math.max(lo, Math.min(hi, targetProb));
  features.drg_code_te = Number(clampTE(0.065, 0.66).toFixed(4));
  features.discharge_location_te = Number(clampTE(0.001, 0.51).toFixed(4));
  features.last_drg_dispo_te = Number(clampTE(0.08, 0.59).toFixed(4));
  features.primary_dx_chapter_te = Number(clampTE(0.09, 0.49).toFixed(4));
  features.race_te = Number(clampTE(0.06, 0.26).toFixed(4));

  return { id: `mock-${seed}`, features };
}

// Calibrate by binary-searching a wide-range lever (clinical_complexity) so the
// model's probability lands near targetProb. Stops early if saturated.
function calibrate(patient: Patient, targetProb: number): Patient {
  let lo = -2.38;
  let hi = 352;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    patient.features.clinical_complexity = Number(mid.toFixed(3));
    const p = probabilityFor(patient.features);
    if (Math.abs(p - targetProb) < 0.005) break;
    if (p < targetProb) lo = mid;
    else hi = mid;
  }
  return patient;
}

const EXAMPLE_PROBS = [0.08, 0.27, 0.48, 0.71, 0.91];
const EXAMPLES: Patient[] = EXAMPLE_PROBS.map((p, i) => calibrate(makePatient(p, 1000 + i), p));

// --- Prediction ---------------------------------------------------------

function probabilityFor(features: PatientFeatures): number {
  const num = (v: FeatureValue, fb: number) =>
    typeof v === "number" && !Number.isNaN(v) ? v : fb;

  // Pull a handful of high-signal features for a deterministic score
  const score =
    0.9 * num(features.drg_code_te, 0.2) +
    0.8 * num(features.discharge_location_te, 0.2) +
    0.7 * num(features.last_drg_dispo_te, 0.17) +
    0.6 * num(features.primary_dx_chapter_te, 0.21) +
    0.12 * num(features.prior_admissions_6m, 0) +
    0.08 * num(features.prior_readmission_count, 0) +
    0.04 * num(features.log_prior_admits_6m, 0) +
    0.02 * num(features.severity_x_readmit, 0) +
    0.01 * num(features.clinical_complexity, 0) -
    0.0005 * num(features.time_since_last_discharge, 80) +
    (["SNF_SNF", "TRANSFER_ACUTE", "HOSPICE", "DEATH"].includes(String(features.last_drg_dispo)) ? 0.5 : 0) +
    (["Skilled Nursing", "Acute Transfer", "Against Medical Advice", "Hospice"].includes(
      String(features.discharge_location),
    )
      ? 0.4
      : 0) +
    (features.primary_dx_chapter === "renal" || features.primary_dx_chapter === "circ" ? 0.25 : 0) +
    // Inject hash so even default-median forms produce non-trivial variation
    (hashFeatures(features) - 0.5) * 0.4;
  return sigmoid(score - 1.4);
}

function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

// --- API ----------------------------------------------------------------

export const mockApi = {
  async getMetadata(): Promise<Metadata> {
    return delay(METADATA, 180);
  },
  async getHealth(): Promise<HealthResponse> {
    return delay({ status: "ok", model: MODEL_NAME }, 80);
  },
  async getExamples(_n = 5): Promise<ExamplesResponse> {
    return delay({ examples: EXAMPLES, n: EXAMPLES.length }, 220);
  },
  async predict(features: PatientFeatures, threshold: number): Promise<Prediction> {
    const probability = probabilityFor(features);
    const warnings: string[] = [];
    const nulls = Object.values(features).filter((v) => v === null).length;
    if (nulls > 10) warnings.push(`${nulls} fields are missing — imputed with cohort medians.`);
    return delay(
      {
        probability,
        prediction: probability >= threshold ? 1 : 0,
        threshold,
        model_name: MODEL_NAME,
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

    // Per-feature seed so the same feature gets a stable sign tendency,
    // but values still respond to the actual feature value.
    const featureRng = (name: string) => {
      let h = 5381 >>> 0;
      for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) >>> 0;
      return seeded(h);
    };

    // Compute raw contributions: a mix of positive and negative.
    const raw: number[] = FEATURES.map((f) => {
      const v = features[f.name];
      const rng = featureRng(f.name);
      const noise = (rng() - 0.5) * 0.4;

      if (f.type === "categorical") {
        const isHighRisk =
          (f.name === "discharge_location" &&
            ["Skilled Nursing", "Acute Transfer", "Against Medical Advice", "Hospice"].includes(
              String(v),
            )) ||
          (f.name === "last_drg_dispo" &&
            ["SNF_SNF", "TRANSFER_ACUTE", "HOSPICE", "DEATH"].includes(String(v))) ||
          (f.name === "primary_dx_chapter" && (v === "renal" || v === "circ")) ||
          (f.name === "drg_code" && ["871", "885", "291", "292"].includes(String(v)));
        const isProtective =
          (f.name === "discharge_location" && v === "Home") ||
          (f.name === "last_drg_dispo" && v === "HOME_HOME") ||
          (f.name === "primary_dx_chapter" && (v === "musc" || v === "ment"));
        const base = isHighRisk ? 0.6 : isProtective ? -0.5 : -0.15 + noise;
        return base + noise * 0.5;
      }

      if (v === null || typeof v !== "number") return noise * 0.3;
      const span = Math.max(1e-6, f.max - f.min);
      const norm = (v - f.median) / span; // can be negative
      // Some features are "worse when lower"
      const invertedLower = ["time_since_last_discharge", "log_time_since_discharge", "sodium_last"].includes(
        f.name,
      );
      const directional = invertedLower ? -norm : norm;
      return directional * (0.5 + Math.abs(norm)) + noise * 0.4;
    });

    // Rescale to preserve additivity: sum(shap) + base ≈ targetLogit
    const sumRaw = raw.reduce((a, b) => a + b, 0);
    const scale = Math.abs(sumRaw) < 1e-9 ? 0 : totalShap / sumRaw;
    let shap_values = raw.map((r) => r * scale);

    // Guarantee we have a mix of positive and negative values
    const pos = shap_values.filter((s) => s > 0).length;
    const neg = shap_values.filter((s) => s < 0).length;
    if (pos === 0 || neg === 0) {
      // Flip sign on a handful by adding small offsets that cancel out
      const flipIdx = [3, 7, 11, 17];
      let offset = 0;
      for (const i of flipIdx) {
        if (i < shap_values.length) {
          const delta = (shap_values[i] || 0.001) * -1.3;
          shap_values[i] += delta;
          offset += delta;
        }
      }
      // Compensate to keep additivity
      const compIdx = shap_values.findIndex((_, i) => !flipIdx.includes(i));
      if (compIdx >= 0) shap_values[compIdx] -= offset;
    }

    shap_values = shap_values.map((s) => Number(s.toFixed(6)));

    return delay(
      {
        shap_values,
        base_value: Number(baseValue.toFixed(6)),
        feature_names: FEATURES.map((f) => f.name),
        feature_values_transformed: FEATURES.map((f) => {
          const v = features[f.name];
          if (v === null || v === undefined) return null;
          if (typeof v === "number") return v;
          if (f.type === "categorical") return f.levels.indexOf(v);
          return null;
        }),
        probability,
        model_name: MODEL_NAME,
        fallback_warnings: [],
      },
      320,
    );
  },
};
