export function Logo({ size = 32 }: { size?: number }) {
  // Two diverging lines forming an asymmetric V, meeting at an indigo dot.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="RiskPath">
      {/* upper arm rising (rose) */}
      <path
        d="M7 16 L26 5"
        stroke="oklch(0.645 0.246 16.439)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* lower arm descending (emerald) */}
      <path
        d="M7 16 L26 26"
        stroke="oklch(0.696 0.17 162.48)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* decision point */}
      <circle cx="7" cy="16" r="3" fill="oklch(0.511 0.222 277.0)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span
      className="text-[18px] font-semibold"
      style={{ letterSpacing: "-0.02em" }}
    >
      RiskPath
    </span>
  );
}
