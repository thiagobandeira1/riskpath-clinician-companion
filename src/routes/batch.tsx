import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet } from "lucide-react";
import { ComingSoonCard } from "@/components/coming-soon-card";

export const Route = createFileRoute("/batch")({
  head: () => ({
    meta: [
      { title: "Batch Score — RiskPath" },
      {
        name: "description",
        content: "Upload a CSV or JSONL of patients and score the full batch in a single XGBoost forward pass.",
      },
    ],
  }),
  component: () => (
    <ComingSoonCard
      icon={FileSpreadsheet}
      title="Batch Score"
      body="Upload a CSV or JSONL of patients, score the full batch in a single XGBoost forward pass, and export results with risk-band coloring. Backed by POST /predictions/batch (up to 100 patients per request)."
      preview="table"
    />
  ),
});
