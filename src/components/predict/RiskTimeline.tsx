import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrajectoryResponse } from "@/lib/types";

interface Props {
  trajectory: TrajectoryResponse | null;
  loading: boolean;
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { day: number; cumulative: number; increment: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-semibold">Day {p.day}</div>
      <div className="mt-1 text-muted-foreground">
        Readmitted by this day:{" "}
        <span className="font-mono font-semibold text-foreground">{pct(p.cumulative)}</span>
      </div>
      <div className="text-muted-foreground">
        Risk added on this day:{" "}
        <span className="font-mono font-semibold text-foreground">{pct(p.increment)}</span>
      </div>
    </div>
  );
}

export function RiskTimeline({ trajectory, loading }: Props) {
  if (loading && !trajectory) {
    return <Skeleton className="h-[340px] w-full" />;
  }
  if (!trajectory) return null;

  const data = trajectory.days.map((day, i) => ({
    day,
    cumulative: trajectory.cumulative_probability[i],
    increment: trajectory.daily_increment[i],
  }));

  // Peak-risk day: where the most new risk accrues.
  const peakIdx = trajectory.daily_increment.reduce(
    (best, v, i, arr) => (v > arr[best] ? i : best),
    0,
  );
  const peakDay = trajectory.days[peakIdx];
  const withinWindow = trajectory.median_predicted_day <= 30;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Readmission risk timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-6">
          <div>
            <div className="font-mono text-2xl font-semibold tabular-nums">
              {pct(trajectory.horizon_probability)}
            </div>
            <div className="text-xs text-muted-foreground">Cumulative risk by day 30</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-semibold tabular-nums">Day {peakDay}</div>
            <div className="text-xs text-muted-foreground">Highest single-day risk</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-semibold tabular-nums">
              {withinWindow ? `Day ${trajectory.median_predicted_day}` : "Beyond 30d"}
            </div>
            <div className="text-xs text-muted-foreground">
              {withinWindow ? "Median predicted return" : "Median return outside window"}
            </div>
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
              <XAxis
                dataKey="day"
                ticks={[1, 7, 14, 21, 30]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Days since discharge",
                  position: "insideBottom",
                  offset: -2,
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <YAxis
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
                label={{
                  value: "Cumulative risk",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))", textAnchor: "middle" },
                }}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine x={7} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" opacity={0.5} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#riskFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Probability this patient is readmitted <em>by</em> each day after discharge. The dashed
          line marks day 7, the window in which prompt follow-up contact is most preventive.{" "}
          {trajectory.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}
