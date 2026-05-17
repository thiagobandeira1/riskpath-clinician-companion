import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export const Route = createFileRoute("/model")({
  head: () => ({
    meta: [
      { title: "Model Card — RiskPath" },
      {
        name: "description",
        content: "Methodology, training data lineage, performance benchmarks, fairness audits, and version history for the readmission model.",
      },
    ],
  }),
  component: ModelPage,
});

function ModelPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["metadata"],
    queryFn: () => api.getMetadata(),
    staleTime: Infinity,
  });

  const info = data?.model_info;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center pt-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <ScrollText className="h-7 w-7" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Badge variant="secondary">Coming soon</Badge>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Model Card</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          Methodology, training data lineage, intended use, performance benchmarks,
          fairness audits, and version history. Read from <code className="font-mono">GET /metadata.model_info</code>{" "}
          and a static <code className="font-mono">model-card.md</code>.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Model Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !info ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Row k="Model name" v={info.name} />
              <Row k="Seed" v={String(info.seed)} />
              <Row k="Features" v={String(info.n_features)} />
              <Row k="Default threshold" v={data!.default_threshold.toFixed(2)} />
              <Row k="Published test AUROC" v={info.published_test_auroc.toFixed(4)} />
              <Row k="Deployed test AUROC" v={info.deployed_test_auroc.toFixed(4)} />
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-mono text-sm mt-0.5">{v}</dd>
    </div>
  );
}
