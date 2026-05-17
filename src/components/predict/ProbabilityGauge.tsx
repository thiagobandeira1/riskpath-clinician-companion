import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface Props {
  probability: number | null;
  atRisk: boolean | null;
  updatedAt: number | null;
  loading: boolean;
}

// Build a semicircular arc path
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

export function ProbabilityGauge({ probability, atRisk, updatedAt, loading }: Props) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) => v.toFixed(3));

  useEffect(() => {
    spring.set(probability ?? 0);
  }, [probability, spring]);

  // arc length approx: π * R for semicircle
  const arcLength = Math.PI * R;
  const dashOffset = useTransform(spring, (v) => arcLength * (1 - v));

  return (
    <Card className="h-full">
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
            {/* track */}
            <path
              d={FULL_PATH}
              stroke="currentColor"
              className="text-border"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
            />
            {/* filled arc */}
            <motion.path
              d={FULL_PATH}
              stroke="url(#gauge-grad)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              style={{ strokeDashoffset: dashOffset }}
            />
            {/* tick labels */}
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
            <motion.div className="text-[48px] leading-none font-mono font-semibold tabular-nums">
              {display}
            </motion.div>
          )}
        </div>

        {atRisk !== null && probability !== null && (
          <Badge
            variant="secondary"
            className={
              atRisk
                ? "mt-4 bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200 border-rose-200 dark:border-rose-900"
                : "mt-4 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900"
            }
          >
            {atRisk ? "AT RISK" : "LOW RISK"}
          </Badge>
        )}

        {updatedAt && (
          <div className="mt-3 text-xs text-muted-foreground">
            Last updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
