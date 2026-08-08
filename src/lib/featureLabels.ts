// Human-readable display labels for V7 feature names.
// API contract is unchanged — these are display-only.

export const FEATURE_LABELS: Record<string, string> = {
  drg_code: "DRG Code",
  last_drg_dispo: "Prior Discharge Disposition",
  discharge_location: "Discharge Location",
  primary_dx_chapter: "Primary Diagnosis Chapter",
  los_trend_180d: "Length-of-Stay Trend (180 days)",
  drg_code_te: "DRG Code Target Encoding",
  late_order_rate: "Late Order Rate",
  primary_dx_chapter_te: "Diagnosis Chapter Target Encoding",
  prior_admits_6m_sq: "Prior Admissions (6mo, squared)",
  discharge_location_te: "Discharge Location Target Encoding",
  prior_admits_x_age: "Prior Admissions × Age",
  prior_readmission_count: "Prior Readmission Count",
  prior_admissions_6m: "Prior Admissions (last 6 months)",
  time_since_last_discharge: "Days Since Last Discharge",
  renal_risk_x_age: "Renal Risk × Age",
  freq_x_recency: "Admission Frequency × Recency",
  high_risk_meds_x_age: "High-Risk Medications × Age",
  orders_last_6h: "Orders in Last 6 Hours",
  last_drg_dispo_te: "Prior Disposition Target Encoding",
  med_orders_ratio: "Medication Orders Ratio",
  los_trend_x_prior_6m: "LOS Trend × Prior Admissions (6mo)",
  bmi_last: "Last Recorded BMI",
  orders_first_24h: "Orders in First 24 Hours",
  prior_mean_los_6m: "Prior Mean LOS (6 months)",
  severity_x_readmit: "Severity × Readmit History",
  severity_x_lab_abnormal: "Severity × Lab Abnormality",
  log_n_labs: "Log (# of Labs)",
  max_unit_los_days: "Max Unit LOS (days)",
  anemia_x_prior_admits: "Anemia × Prior Admissions",
  los_trend_x_prior_admits: "LOS Trend × Prior Admissions",
  log_prior_readmit_count: "Log (Prior Readmissions)",
  log_prior_admits_6m: "Log (Prior Admissions 6mo)",
  nonenglish_x_prior_admits: "Non-English × Prior Admissions",
  log_time_since_discharge: "Log (Days Since Discharge)",
  los_x_n_diagnoses: "LOS × # Diagnoses",
  prior_admissions_all: "Prior Admissions (all time)",
  new_med_rate_48h: "New Medication Rate (48h)",
  clinical_complexity: "Clinical Complexity",
  los_per_prior_admit: "LOS per Prior Admission",
  discharge_surge: "Discharge Surge Indicator",
  bilirubin_max: "Max Bilirubin",
  bp_diastolic_outpatient: "Diastolic BP (outpatient)",
  comorbidity_pc4: "Comorbidity Component 4",
  n_emar_details: "# eMAR Details",
  iv_admin_rate: "IV Administration Rate",
  bun_creatinine_ratio: "BUN/Creatinine Ratio",
  rapid_tfr_x_readmit: "Rapid Transfer × Readmit",
  admission_type: "Admission Type",
  admission_location: "Admission Location",
  age_at_admit: "Age at Admission",
  los_days: "Length of Stay (days)",
  n_diagnoses: "Number of Diagnoses",
  n_procedures: "Number of Procedures",
  discharge_hour: "Discharge Hour (0-23)",
  albumin_last: "Albumin (last, g/dL)",
  bun_last: "BUN (last, mg/dL)",
  creatinine_last: "Creatinine (last, mg/dL)",
  sodium_last: "Sodium (last, mEq/L)",
  hemoglobin_last: "Hemoglobin (last, g/dL)",
  wbc_last: "White Blood Cells (last, K/uL)",
  glucose_last: "Glucose (last, mg/dL)",
  bicarbonate_last: "Bicarbonate (last, mEq/L)",
  lab_abnormal_rate: "Abnormal Lab Rate",
  n_labs_total: "Total Lab Results",
  n_lab_item_types: "Distinct Lab Types",
  n_lab_orders: "Lab Orders",
  elix_mets: "Metastatic Cancer",
  elix_solid_tumor: "Solid Tumour",
  elix_psychoses: "Psychoses",
  severity_composite: "Severity Composite",
  n_meds_total: "Total Medication Orders",
  n_discharge_drugs: "Discharge Medications",
  distinct_drugs: "Distinct Drugs",
  orders_per_day: "Orders per Day",
  n_late_orders: "Late Orders",
  late_order_burden: "Late Order Burden",
  n_distinct_providers: "Distinct Providers",
  albumin_x_los: "Albumin x Length of Stay",
  creatinine_x_bun: "Creatinine x BUN",
  n_meds_x_age: "Discharge Medications x Age",
  provider_fragmentation_x_los: "Provider Count x Length of Stay",
  n_order_types: "# Order Types",
};

export const DX_CHAPTER_LABELS: Record<string, string> = {
  circ: "Circulatory",
  resp: "Respiratory",
  dig: "Digestive",
  endo: "Endocrine",
  inj: "Injury",
  neop: "Neoplasm",
  musc: "Musculoskeletal",
  ment: "Mental Health",
  infe: "Infectious",
  renal: "Renal",
  gu: "Genitourinary",
  blood: "Blood Disorder",
  skin: "Skin",
};

function titleCase(s: string): string {
  return s
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getLabel(name: string): { primary: string; technical: string } {
  return {
    primary: FEATURE_LABELS[name] ?? titleCase(name),
    technical: name,
  };
}

export function getChapterLabel(value: string | null | undefined): string {
  if (value == null) return "—";
  return DX_CHAPTER_LABELS[value] ?? value;
}
