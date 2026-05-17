import { Sparkles, RotateCw } from "lucide-react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Explanation } from "@/lib/types";
import { getLabel } from "@/lib/featureLabels";

function CustomYTick(props: { x?: number; y?: number; payload?: { value: string } }) {
  const { x = 0, y = 0, payload } = props;
  if (!payload) return null;
  const { primary, technical } = getLabel(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-6} y={-2} textAnchor="end" className="fill-foreground" style={{ fontSize: 11, fontWeight: 500 }}>
        {primary}
      </text>
      <text x={-6} y={11} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 9, fontFamily: "JetBrains Mono" }}>
        ({technical})
      </text>
    </g>
  );
}

interface Props {
  explanation: Explanation | null;
  loading: boolean;
  onReexplain: () => void;
  disabled?: boolean;
}

export function ShapWaterfall({ explanation, loading, onReexplain, disabled }: Props) {
  let topData: { name: string; shap: number; value: number | null }[] = [];
  if (explanation) {
    topData = explanation.shap_values
      .map((s, i) => ({
        name: explanation.feature_names[i],
        shap: s,
        value: explanation.feature_values_transformed[i],
      }))
      .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap))
      .slice(0, 5)
      .reverse(); // recharts plots from bottom up; reverse so largest sits at top
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Top 5 Risk Drivers
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onReexplain}
          disabled={disabled || loading}
          className="h-8"
        >
          <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Re-explain
        </Button>
      </CardHeader>
      <CardContent>
        {loading && !explanation ? (
          <div className="space-y-3 py-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : !explanation ? (
          <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
            <Sparkles className="h-8 w-8 mb-3 opacity-50" />
            <p className="text-sm max-w-xs">
              Click Re-explain to see the features driving this prediction.
            </p>
          </div>
        ) : (
          <div className="h-[260px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  domain={(() => {
                    const maxAbs = Math.max(
                      0.0001,
                      ...topData.map((d) => Math.abs(d.shap)),
                    );
                    return [-maxAbs, maxAbs];
                  })()}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={200}
                  tick={<CustomYTick />}
                  stroke="currentColor"
                  className="text-foreground"
                  interval={0}
                />
                <ReferenceLine x={0} stroke="currentColor" className="text-border" />
                <Tooltip
                  cursor={{ fill: "rgba(127,127,127,0.08)" }}
                  content={((props: { active?: boolean; payload?: Array<{ payload: { name: string; shap: number; value: number | null } }> }) => {
                    const { active, payload } = props;
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    const { primary, technical } = getLabel(d.name);
                    const label =
                      d.shap >= 0
                        ? `Increased risk by ${Math.abs(d.shap).toFixed(4)} log-odds`
                        : `Decreased risk by ${Math.abs(d.shap).toFixed(4)} log-odds`;
                    return (
                      <div className="rounded-md border bg-popover text-popover-foreground shadow-md px-3 py-2 text-xs">
                        <div className="font-medium">{primary}</div>
                        <div className="font-mono text-[10px] text-muted-foreground mb-1">{technical}</div>
                        <div>{label}</div>
                        <div className="text-muted-foreground mt-0.5">value: {d.value === null ? "missing" : d.value}</div>
                      </div>
                    );
                  }) as never}
                />

                <Bar dataKey="shap" radius={[3, 3, 3, 3]}>
                  {topData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.shap >= 0 ? "oklch(0.645 0.246 16.439)" : "oklch(0.696 0.17 162.48)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
