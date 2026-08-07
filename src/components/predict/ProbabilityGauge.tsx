import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { bandForProbability, type RiskBandCutpoints } from "@/lib/riskBands";
import { cn } from "@/lib/utils";

interface Props {
  probability: number | null;
  updatedAt: number | null;
  loading: boolean;
  bands?: RiskBandCutpoints;
}

const W = 280;
const H = 160;
const CX = W / 2;
const CY = H - 12;
const R = 110;

function polar(angleDeg: number) {
  const a = ((angleDeg - 180) * Math.PI) / 180;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}

const START = polar(0);
const END = polar(180);
const FULL_PATH = `M ${START.x} ${START.y} A ${R} ${R} 0 0 1 ${END.x} ${END.y}`;

export function ProbabilityGauge({ probability, updatedAt, loading, bands }: Props) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) => v.toFixed(3));

  const prevRef = useRef<number | null>(null);
  const [blurArc, setBlurArc] = useState(false);
  const [pulseHex, setPulseHex] = useState<string | null>(null);

  useEffect(() => {
    spring.set(probability ?? 0);
    if (probability !== null) {
      const prev = prevRef.current;
      if (prev !== null) {
        const delta = Math.abs(probability - prev);
        if (delta > 0.1) {
          setBlurArc(true);
          setTimeout(() => setBlurArc(false), 250);
        }
        const prevBand = bandForProbability(prev, bands).id;
        const nextBand = bandForProbability(probability, bands).id;
        if (prevBand !== nextBand) {
          setPulseHex(bandForProbability(probability, bands).hex);
          setTimeout(() => setPulseHex(null), 320);
        }
      }
      prevRef.current = probability;
    }
  }, [probability, spring, bands]);

  const arcLength = Math.PI * R;
  const dashOffset = useTransform(spring, (v) => arcLength * (1 - v));
  const band = probability === null ? null : bandForProbability(probability, bands);

  return (
    <Card
      className={cn("h-full transition-shadow duration-300")}
      style={pulseHex ? { boxShadow: `0 0 0 2px ${pulseHex}` } : undefined}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          30-Day Risk Probability
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-6">
        <div className="relative w-full flex justify-center">
          <svg width={W} height={H} className="overflow-visible">
            <defs>
              <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="oklch(0.696 0.17 162.48)" />
                <stop offset="50%" stopColor="oklch(0.828 0.189 84.429)" />
                <stop offset="100%" stopColor="oklch(0.645 0.246 16.439)" />
              </linearGradient>
            </defs>
            <path
              d={FULL_PATH}
              stroke="currentColor"
              className="text-border"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
            />
            <motion.path
              d={FULL_PATH}
              stroke="url(#gauge-grad)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              style={{
                strokeDashoffset: dashOffset,
                filter: blurArc ? "blur(2px)" : "none",
                transition: "filter 250ms ease-out",
              }}
            />
            <text x={START.x - 4} y={CY + 18} className="fill-muted-foreground" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">
              0.00
            </text>
            <text x={CX} y={CY - R - 6} className="fill-muted-foreground" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">
              0.50
            </text>
            <text x={END.x + 4} y={CY + 18} className="fill-muted-foreground" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">
              1.00
            </text>
          </svg>
        </div>

        <div className="-mt-6 text-center">
          {loading && probability === null ? (
            <Skeleton className="h-12 w-32 mx-auto" />
          ) : probability === null ? (
            <div className="text-3xl font-mono text-muted-foreground">—.———</div>
          ) : (
            <motion.div className="text-[48px] leading-none font-mono font-semibold tabular-nums tracking-tight">
              {display}
            </motion.div>
          )}
        </div>

        {band !== null && probability !== null && (
          <Badge variant="outline" className={cn("mt-4 border", band.badgeClass)}>
            {band.label}
          </Badge>
        )}

        <div className="mt-2 text-[11px] text-muted-foreground">
          {bands ? "Bands: model-calibrated (p50/p80/p95)" : "Bands: fixed thresholds"}
        </div>

        {updatedAt && (
          <div className="mt-3 text-xs text-muted-foreground">
            Last updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
