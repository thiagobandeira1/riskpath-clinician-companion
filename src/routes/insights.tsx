import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ComingSoonCard } from "@/components/coming-soon-card";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Population Insights — RiskPath" },
      {
        name: "description",
        content: "Population-level SHAP distributions, calibration curves, feature importance rankings, and drift monitoring across cohorts.",
      },
    ],
  }),
  component: () => (
    <ComingSoonCard
      icon={BarChart3}
      title="Population Insights"
      body="Population-level SHAP distributions, calibration curves, feature importance rankings, and drift monitoring across cohorts. Backed by aggregated POST /explanations and the model_info from GET /metadata."
      preview="chart"
    />
  ),
});
