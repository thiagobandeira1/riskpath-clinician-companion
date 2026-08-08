export type FeatureMeta =
  | {
      name: string;
      type: "numeric";
      min: number;
      median: number;
      max: number;
      pct_nan: number;
    }
  | {
      name: string;
      type: "categorical";
      levels: string[];
      pct_nan: number;
    };

export interface ModelInfo {
  name: string;
  seed: number;
  n_features: number;
  published_test_auroc: number;
  deployed_test_auroc: number;
}

export interface Metadata {
  features: FeatureMeta[];
  model_info: ModelInfo;
  default_threshold: number;
  risk_bands?: {
    low_max: number;
    moderate_max: number;
    high_max: number;
    basis?: string;
  };
}

export type FeatureValue = string | number | null;
export type PatientFeatures = Record<string, FeatureValue>;

export interface Patient {
  id?: string;
  features: PatientFeatures;
}

export interface ExamplesResponse {
  examples: Patient[];
  n: number;
}

export interface Prediction {
  probability: number;
  prediction: 0 | 1;
  threshold: number;
  model_name: string;
  fallback_warnings: string[];
}

export interface Explanation {
  shap_values: number[];
  base_value: number;
  feature_names: string[];
  feature_values_transformed: (number | null)[];
  probability: number;
  model_name: string;
  fallback_warnings: string[];
}

export interface ApiError {
  error: {
    code: "VALIDATION_ERROR" | "INTERNAL_ERROR" | "NETWORK_ERROR";
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface HealthResponse {
  status: "ok";
  model: string;
}

export interface BatchPredictionItem {
  probability: number;
  prediction: 0 | 1;
}

export interface BatchPredictionResponse {
  results: BatchPredictionItem[];
  threshold: number;
  model_name: string;
  n: number;
  fallback_warnings: string[];
}

export interface TrajectoryResponse {
  days: number[];
  cumulative_probability: number[];
  daily_increment: number[];
  median_predicted_day: number;
  horizon_probability: number;
  model_name: string;
  disclaimer: string;
  fallback_warnings: string[];
}
