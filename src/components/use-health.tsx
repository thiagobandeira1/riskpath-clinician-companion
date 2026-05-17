import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export interface HealthState {
  online: boolean;
  history: boolean[]; // last 10 polls
}

export function useHealth(): HealthState {
  const failures = useRef(0);
  const [history, setHistory] = useState<boolean[]>([]);
  const { data, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.getHealth(),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    retry: false,
  });

  useEffect(() => {
    const ok = !!data && !isError;
    if (ok) failures.current = 0;
    else failures.current += 1;
    setHistory((h) => [...h.slice(-9), ok]);
  }, [data, isError]);

  const online = failures.current < 2;
  return { online, history };
}
