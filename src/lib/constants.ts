export const APP_VERSION = "0.1.0";
export const BUILD_SHA = "30e518d";
export const MODEL_IDENTIFIER = "xgboost-rfe67-seed42";
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
export const USE_MOCK_API =
  String(import.meta.env.VITE_USE_MOCK_API ?? "").toLowerCase() === "true";
