import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
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

// Indigo reads clearly on both the light and dark themes; the palette is
// defined in oklch, so chart colours are given as literal hex rather than
// via CSS variables (recharts writes them straight into SVG attributes).
const LINE = "#818cf8";
const FILL = "#6366f1";
const AXIS = "#8b9bb4";
const GRID = "#3b4658";
const MARK = "#f472b6";

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
    <div className="rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <div className="font-semibold">Day {p.day}</div>
      <div className="mt-1 flex items-center justify-between gap-4 text-muted-foreground">
        <span>Readmitted by then</span>
        <span className="font-mono font-semibold text-foreground">{pct(p.cumulative)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-muted-foreground">
        <span>Added that day</span>
        <span className="font-mono font-semibold text-foreground">{pct(p.increment)}</span>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[130px]">
      <div className="font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function RiskTimeline({ trajectory, loading }: Props) {
  if (loading && !trajectory) return <Skeleton className="h-[360px] w-full" />;
  if (!trajectory) return null;

  const data = trajectory.days.map((day, i) => ({
    day,
    cumulative: trajectory.cumulative_probability[i],
    increment: trajectory.daily_increment[i],
  }));

  const weekOne = trajectory.cumulative_probability[6] ?? 0;
  const total = trajectory.horizon_probability;
  const shareWeekOne = total > 0 ? Math.round((weekOne / total) * 100) : 0;
  const withinWindow = trajectory.median_predicted_day <= 30;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Readmission risk timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-5 flex flex-wrap gap-x-10 gap-y-4">
          <Stat value={pct(total)} label="Cumulative risk by day 30" />
          <Stat value={pct(weekOne)} label={`Risk within 7 days · ${shareWeekOne}% of the window`} />
          <Stat
            value={withinWindow ? `Day ${trajectory.median_predicted_day}` : "Beyond 30d"}
            label={withinWindow ? "Median predicted return" : "Median return outside window"}
          />
        </div>

        <div className="h-[230px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 18, bottom: 26, left: 6 }}>
              <defs>
                <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={FILL} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={FILL} stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke={GRID} strokeOpacity={0.45} vertical={false} />

              <XAxis
                dataKey="day"
                ticks={[1, 7, 14, 21, 30]}
                tick={{ fontSize: 11, fill: AXIS }}
                tickLine={false}
                axisLine={{ stroke: GRID, strokeOpacity: 0.6 }}
                tickMargin={8}
                label={{
                  value: "Days since discharge",
                  position: "insideBottom",
                  offset: -16,
                  fill: AXIS,
                  fontSize: 11,
                }}
              />
              <YAxis
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                tick={{ fontSize: 11, fill: AXIS }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickMargin={4}
              />

              <Tooltip content={<ChartTooltip />} cursor={{ stroke: AXIS, strokeOpacity: 0.35 }} />

              <ReferenceLine
                x={7}
                stroke={MARK}
                strokeDasharray="3 3"
                strokeOpacity={0.7}
                label={{ value: "day 7", position: "top", fill: MARK, fontSize: 10 }}
              />

              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={LINE}
                strokeWidth={2.75}
                fill="url(#riskFill)"
                dot={false}
                activeDot={{ r: 4, fill: LINE, stroke: "#0b1220", strokeWidth: 2 }}
              />

              <ReferenceDot
                x={7}
                y={weekOne}
                r={4}
                fill={MARK}
                stroke="#0b1220"
                strokeWidth={2}
                isFront
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Probability this patient is readmitted <em>by</em> each day after discharge. The marker at
          day 7 is the window in which prompt follow-up contact is most preventive.{" "}
          {trajectory.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}
