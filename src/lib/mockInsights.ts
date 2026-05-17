// Self-contained synthetic cohort for the /insights module. 100 patients,
// each with a probability, an actual_readmit label correlated with prob,
// per-feature SHAP magnitudes (for population driver aggregation), and a
// numeric feature value (for distribution sparklines).
//
// Pure mock — never claims to reflect real population stats.

const NUMERIC_FEATURES: { name: string; min: number; median: number; max: number }[] = [
  { name: "los_trend_180d", min: -131, median: 0, max: 192 },
  { name: "drg_code_te", min: 0.065, median: 0.2, max: 0.66 },
  { name: "late_order_rate", min: 0, median: 0.11, max: 1 },
  { name: "primary_dx_chapter_te", min: 0.09, median: 0.21, max: 0.49 },
  { name: "prior_admits_6m_sq", min: 0, median: 0, max: 1089 },
  { name: "discharge_location_te", min: 0.001, median: 0.2, max: 0.51 },
  { name: "prior_admits_x_age", min: 0, median: 0, max: 1980 },
  { name: "prior_readmission_count", min: 0, median: 0, max: 51 },
  { name: "prior_admissions_6m", min: 0, median: 0, max: 33 },
  { name: "time_since_last_discharge", min: 0, median: 80, max: 5279 },
  { name: "renal_risk_x_age", min: 0, median: 0, max: 106 },
  { name: "freq_x_recency", min: 0, median: 0.009, max: 150 },
  { name: "high_risk_meds_x_age", min: 0, median: 79, max: 212 },
  { name: "orders_last_6h", min: 0, median: 0.92, max: 251 },
  { name: "last_drg_dispo_te", min: 0.08, median: 0.17, max: 0.59 },
  { name: "med_orders_ratio", min: 0, median: 0.45, max: 1 },
  { name: "los_trend_x_prior_6m", min: -170, median: 0, max: 192 },
  { name: "bmi_last", min: 12, median: 27.3, max: 79.8 },
  { name: "orders_first_24h", min: 0, median: 24, max: 50400 },
  { name: "prior_mean_los_6m", min: 0, median: 0, max: 308 },
  { name: "severity_x_readmit", min: 0, median: 0, max: 11.8 },
  { name: "severity_x_lab_abnormal", min: 0, median: 1.09, max: 15.75 },
  { name: "log_n_labs", min: 0, median: 4.43, max: 9.84 },
  { name: "max_unit_los_days", min: 0, median: 2.14, max: 169 },
  { name: "anemia_x_prior_admits", min: 0, median: 0, max: 18 },
  { name: "los_trend_x_prior_admits", min: -1197, median: 0, max: 1400 },
  { name: "log_prior_readmit_count", min: 0, median: 0, max: 3.95 },
  { name: "log_prior_admits_6m", min: 0, median: 0, max: 3.53 },
  { name: "nonenglish_x_prior_admits", min: 0, median: 0, max: 33 },
  { name: "log_time_since_discharge", min: 0, median: 4.4, max: 8.57 },
  { name: "los_x_n_diagnoses", min: 0, median: 34, max: 10780 },
  { name: "prior_admissions_all", min: 0, median: 1, max: 237 },
  { name: "new_med_rate_48h", min: 0, median: 4.25, max: 92 },
  { name: "clinical_complexity", min: -2.38, median: 3.82, max: 352 },
  { name: "los_per_prior_admit", min: 0, median: 1, max: 308 },
  { name: "discharge_surge", min: 0, median: 0, max: 1 },
  { name: "race_te", min: 0.06, median: 0.21, max: 0.26 },
  { name: "bilirubin_max", min: 0, median: 0, max: 82 },
  { name: "sodium_last", min: 82, median: 139, max: 184 },
  { name: "bp_diastolic_outpatient", min: 20, median: 70, max: 148 },
  { name: "comorbidity_pc4", min: -1.7, median: -0.09, max: 1.09 },
  { name: "n_emar_details", min: 0, median: 23, max: 36288 },
  { name: "iv_admin_rate", min: 0, median: 0, max: 1 },
  { name: "bun_creatinine_ratio", min: 0, median: 17.14, max: 272 },
  { name: "rapid_tfr_x_readmit", min: 0, median: 0, max: 9 },
  { name: "n_order_types", min: 0, median: 9, max: 15 },
];

const CATEGORICAL_NAMES = [
  "drg_code",
  "last_drg_dispo",
  "discharge_location",
  "primary_dx_chapter",
];

const ALL_FEATURE_NAMES: string[] = [
  ...CATEGORICAL_NAMES,
  ...NUMERIC_FEATURES.map((f) => f.name),
];

export interface InsightsPatient {
  id: number;
  probability: number;
  actual_readmit: 0 | 1;
}

export interface InsightsCohort {
  patients: InsightsPatient[];
  // mean of |shap| per feature, across cohort
  meanAbsShap: { name: string; value: number }[];
  // numeric distribution samples (100 values) per numeric feature
  distributions: { name: string; values: number[] }[];
  cohortAuroc: number;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// Right-skewed probability sampler in [0.05, 0.95]
function sampleProb(rng: () => number): number {
  // Beta(1.5, 3.5)-like via two uniforms
  const a = Math.pow(rng(), 1 / 1.5);
  const b = Math.pow(rng(), 1 / 3.5);
  const p = a / (a + b);
  return 0.05 + Math.max(0, Math.min(1, p)) * 0.9;
}

function aurocFromScores(scores: number[], labels: number[]): number {
  const n = scores.length;
  const pairs = scores.map((s, i) => ({ s, y: labels[i] }));
  pairs.sort((a, b) => a.s - b.s);
  // ranks (1-indexed, average for ties)
  const ranks = new Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && pairs[j + 1].s === pairs[i].s) j++;
    const avg = (i + j + 2) / 2; // average rank, 1-indexed
    for (let k = i; k <= j; k++) ranks[k] = avg;
    i = j + 1;
  }
  let sumRanksPos = 0;
  let nPos = 0;
  pairs.forEach((p, idx) => {
    if (p.y === 1) {
      sumRanksPos += ranks[idx];
      nPos++;
    }
  });
  const nNeg = n - nPos;
  if (nPos === 0 || nNeg === 0) return 0.5;
  return (sumRanksPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

let CACHED: InsightsCohort | null = null;

export function getInsightsCohort(): InsightsCohort {
  if (CACHED) return CACHED;
  const rng = seeded(42);

  // 1) Probabilities + labels
  const patients: InsightsPatient[] = [];
  const probs: number[] = [];
  const labels: number[] = [];
  for (let i = 0; i < 100; i++) {
    const p = sampleProb(rng);
    // Slightly mis-calibrated label: noisy bernoulli around p
    const noise = (rng() - 0.5) * 0.1;
    const effP = Math.max(0.02, Math.min(0.98, p + noise));
    const y: 0 | 1 = rng() < effP ? 1 : 0;
    patients.push({ id: i + 1, probability: Number(p.toFixed(4)), actual_readmit: y });
    probs.push(p);
    labels.push(y);
  }

  // 2) Per-feature mean |SHAP|. Higher for "well-known" drivers.
  const driverPriors: Record<string, number> = {
    discharge_location: 0.55,
    last_drg_dispo: 0.5,
    primary_dx_chapter: 0.42,
    drg_code: 0.38,
    prior_readmission_count: 0.36,
    prior_admissions_6m: 0.34,
    log_prior_admits_6m: 0.32,
    severity_x_readmit: 0.3,
    clinical_complexity: 0.28,
    renal_risk_x_age: 0.26,
    discharge_location_te: 0.24,
    primary_dx_chapter_te: 0.22,
    log_prior_readmit_count: 0.21,
    prior_admits_x_age: 0.2,
    comorbidity_pc4: 0.18,
    bun_creatinine_ratio: 0.16,
    sodium_last: 0.14,
    bmi_last: 0.13,
    high_risk_meds_x_age: 0.13,
    log_n_labs: 0.12,
    los_trend_180d: 0.11,
  };

  const meanAbsShap = ALL_FEATURE_NAMES.map((name) => {
    const base = driverPriors[name] ?? 0.02 + rng() * 0.08;
    const jitter = (rng() - 0.5) * 0.04;
    return { name, value: Math.max(0.005, Number((base + jitter).toFixed(4))) };
  }).sort((a, b) => b.value - a.value);

  // 3) Numeric feature distributions (100 samples each)
  const distributions = NUMERIC_FEATURES.map((f) => {
    const values: number[] = [];
    for (let i = 0; i < 100; i++) {
      const t = rng();
      // triangular-ish: skew toward median
      const u = t < 0.5 ? f.min + (f.median - f.min) * (t * 2) : f.median + (f.max - f.median) * ((t - 0.5) * 2);
      const wobble = (rng() - 0.5) * (f.max - f.min) * 0.08;
      const v = Math.max(f.min, Math.min(f.max, u + wobble));
      const precision = f.max - f.min < 5 ? 4 : f.max - f.min < 100 ? 2 : 1;
      values.push(Number(v.toFixed(precision)));
    }
    return { name: f.name, values };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const cohortAuroc = aurocFromScores(probs, labels);

  CACHED = { patients, meanAbsShap, distributions, cohortAuroc };
  return CACHED;
}

// ------------- Aggregation helpers -------------

export function histogram10(probs: number[]): { bin: string; low: number; high: number; count: number }[] {
  const bins = Array.from({ length: 10 }, (_, i) => ({
    bin: `${(i / 10).toFixed(1)}–${((i + 1) / 10).toFixed(1)}`,
    low: i / 10,
    high: (i + 1) / 10,
    count: 0,
  }));
  probs.forEach((p) => {
    const idx = Math.min(9, Math.floor(p * 10));
    bins[idx].count++;
  });
  return bins;
}

export interface ThresholdMetrics {
  threshold: number;
  sensitivity: number;
  specificity: number;
  ppv: number;
  npv: number;
}

export function computeMetricsAt(
  patients: InsightsPatient[],
  threshold: number,
): ThresholdMetrics {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const p of patients) {
    const pred = p.probability >= threshold ? 1 : 0;
    const y = p.actual_readmit;
    if (pred === 1 && y === 1) tp++;
    else if (pred === 1 && y === 0) fp++;
    else if (pred === 0 && y === 0) tn++;
    else fn++;
  }
  return {
    threshold,
    sensitivity: tp + fn === 0 ? 0 : tp / (tp + fn),
    specificity: tn + fp === 0 ? 0 : tn / (tn + fp),
    ppv: tp + fp === 0 ? 0 : tp / (tp + fp),
    npv: tn + fn === 0 ? 0 : tn / (tn + fn),
  };
}

export function thresholdSweep(patients: InsightsPatient[]): ThresholdMetrics[] {
  const out: ThresholdMetrics[] = [];
  for (let i = 0; i <= 10; i++) {
    out.push(computeMetricsAt(patients, i / 10));
  }
  return out;
}

export function calibrationByDecile(
  patients: InsightsPatient[],
): { decile: number; observed: number; n: number }[] {
  const buckets: { sum: number; n: number }[] = Array.from({ length: 10 }, () => ({ sum: 0, n: 0 }));
  for (const p of patients) {
    const idx = Math.min(9, Math.floor(p.probability * 10));
    buckets[idx].sum += p.actual_readmit;
    buckets[idx].n++;
  }
  return buckets.map((b, i) => ({
    decile: i / 10 + 0.05,
    observed: b.n >= 5 ? b.sum / b.n : NaN,
    n: b.n,
  }));
}
