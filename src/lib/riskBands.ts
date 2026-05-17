// 4-band risk classification used across the platform.
//   LOW       p < 0.30
//   MODERATE  0.30 ≤ p < 0.60
//   HIGH      0.60 ≤ p < 0.85
//   VERY HIGH p ≥ 0.85

export type RiskBandId = "low" | "moderate" | "high" | "very_high";

export interface RiskBand {
  id: RiskBandId;
  label: string;
  /** Bare Tailwind color name (e.g. "emerald-500"). */
  color: string;
  /** Hex equivalent for inline-style SVG fills. */
  hex: string;
  bgClass: string;
  borderClass: string;
  ringClass: string;
  textClass: string;
  /** Badge background+text combo for light & dark mode. */
  badgeClass: string;
  /** Subtle row-tint class. */
  rowTintClass: string;
  /** Left-border (4px) class for cards. */
  leftBorderClass: string;
  description: string;
}

export const RISK_BAND_BOUNDARIES = [0.3, 0.6, 0.85] as const;

const LOW: RiskBand = {
  id: "low",
  label: "LOW",
  color: "emerald-500",
  hex: "#10b981",
  bgClass: "bg-emerald-500",
  borderClass: "border-emerald-500",
  ringClass: "ring-emerald-500",
  textClass: "text-emerald-600 dark:text-emerald-400",
  badgeClass:
    "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-900",
  rowTintClass: "bg-emerald-500/5 hover:bg-emerald-500/10",
  leftBorderClass: "border-l-4 border-l-emerald-500",
  description: "Standard transitional care.",
};

const MODERATE: RiskBand = {
  id: "moderate",
  label: "MODERATE",
  color: "amber-500",
  hex: "#f59e0b",
  bgClass: "bg-amber-500",
  borderClass: "border-amber-500",
  ringClass: "ring-amber-500",
  textClass: "text-amber-600 dark:text-amber-400",
  badgeClass:
    "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900",
  rowTintClass: "bg-amber-500/5 hover:bg-amber-500/10",
  leftBorderClass: "border-l-4 border-l-amber-500",
  description: "Enhanced transitional support.",
};

const HIGH: RiskBand = {
  id: "high",
  label: "HIGH",
  color: "orange-500",
  hex: "#f97316",
  bgClass: "bg-orange-500",
  borderClass: "border-orange-500",
  ringClass: "ring-orange-500",
  textClass: "text-orange-600 dark:text-orange-400",
  badgeClass:
    "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-900",
  rowTintClass: "bg-orange-500/5 hover:bg-orange-500/10",
  leftBorderClass: "border-l-4 border-l-orange-500",
  description: "Intensive multidisciplinary management.",
};

const VERY_HIGH: RiskBand = {
  id: "very_high",
  label: "VERY HIGH",
  color: "rose-500",
  hex: "#f43f5e",
  bgClass: "bg-rose-500",
  borderClass: "border-rose-500",
  ringClass: "ring-rose-500",
  textClass: "text-rose-600 dark:text-rose-400",
  badgeClass:
    "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-900",
  rowTintClass: "bg-rose-500/5 hover:bg-rose-500/10",
  leftBorderClass: "border-l-4 border-l-rose-500",
  description: "Maximum-intensity transitional care bundle.",
};

export const RISK_BANDS: RiskBand[] = [LOW, MODERATE, HIGH, VERY_HIGH];

export function getRiskBand(probability: number): RiskBand {
  if (probability < 0.3) return LOW;
  if (probability < 0.6) return MODERATE;
  if (probability < 0.85) return HIGH;
  return VERY_HIGH;
}

/** Deterministic pseudo-probability for a patient (used for sample-card tinting before scoring). */
export function mockProbabilityFromKey(key: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // Map to [0.05, 0.95]
  return 0.05 + ((h % 9001) / 9001) * 0.9;
}
