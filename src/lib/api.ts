// Real API client. Always tries the real backend first. The mock layer in
// src/lib/mockApi.ts is ONLY consulted when VITE_USE_MOCK_API === "true",
// never as a silent fallback for failed real-backend calls.

import { API_BASE_URL, USE_MOCK_API } from "./constants";
import { mockApi } from "./mockApi";
import type {
  ApiError,
  BatchPredictionResponse,
  ExamplesResponse,
  Explanation,
  HealthResponse,
  Metadata,
  PatientFeatures,
  Prediction,
} from "./types";

class ApiCallError extends Error {
  envelope: ApiError;
  constructor(envelope: ApiError) {
    super(envelope.error.message);
    this.envelope = envelope;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new ApiCallError({
      error: {
        code: "NETWORK_ERROR",
        message: `Cannot reach backend at ${API_BASE_URL}.`,
        details: { cause: String(err) },
      },
    });
  }
  if (!res.ok) {
    let body: ApiError | undefined;
    try {
      body = (await res.json()) as ApiError;
    } catch {
      body = {
        error: {
          code: "INTERNAL_ERROR",
          message: `Request failed with status ${res.status}.`,
        },
      };
    }
    throw new ApiCallError(body);
  }
  return (await res.json()) as T;
}

export const api = {
  async getMetadata(): Promise<Metadata> {
    if (USE_MOCK_API) return mockApi.getMetadata();
    return call<Metadata>("/metadata");
  },
  async getHealth(): Promise<HealthResponse> {
    if (USE_MOCK_API) return mockApi.getHealth();
    return call<HealthResponse>("/health");
  },
  async getExamples(n = 5): Promise<ExamplesResponse> {
    if (USE_MOCK_API) return mockApi.getExamples(n);
    // Real backend returns flat 50-field objects (no { features } wrapper).
    // Normalize to the Patient = { id, features } shape the frontend uses.
    const raw = await call<{ examples: PatientFeatures[]; n: number }>(`/examples?n=${n}`);
    return {
      examples: raw.examples.map((features, idx) => ({
        id: `patient-${idx + 1}`,
        features,
      })),
      n: raw.n,
    };
  },
  async predict(features: PatientFeatures, threshold: number): Promise<Prediction> {
    if (USE_MOCK_API) return mockApi.predict(features, threshold);
    return call<Prediction>(`/predictions?threshold=${threshold}`, {
      method: "POST",
      body: JSON.stringify(features),
    });
  },
  async explain(features: PatientFeatures): Promise<Explanation> {
    if (USE_MOCK_API) return mockApi.explain(features);
    return call<Explanation>(`/explanations`, {
      method: "POST",
      body: JSON.stringify(features),
    });
  },
  async predictBatch(
    patients: PatientFeatures[],
    threshold: number,
  ): Promise<BatchPredictionResponse> {
    if (USE_MOCK_API) return mockApi.predictBatch(patients, threshold);
    // Real backend expects { patients: [{50 flat fields}, ...] }, not { patients: [{features: {...}}, ...] }
    return call<BatchPredictionResponse>(`/predictions/batch?threshold=${threshold}`, {
      method: "POST",
      body: JSON.stringify({ patients }),
    });
  },
};

export { ApiCallError };
