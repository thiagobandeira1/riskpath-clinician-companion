import { Sparkles, RotateCw } from "lucide-react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Explanation } from "@/lib/types";

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
                  domain={["dataMin", "dataMax"]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
                  stroke="currentColor"
                  className="text-foreground"
                  interval={0}
                />
                <ReferenceLine x={0} stroke="currentColor" className="text-border" />
                <Tooltip
                  cursor={{ fill: "rgba(127,127,127,0.08)" }}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, _name, item) => {
                    const v = item.payload as { name: string; shap: number; value: number | null };
                    const dir = value >= 0 ? "INCREASED" : "DECREASED";
                    return [
                      `${value.toFixed(4)} (${dir} risk)`,
                      `value: ${v.value === null ? "missing" : v.value}`,
                    ];
                  }}
                  labelFormatter={(label) => label}
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
