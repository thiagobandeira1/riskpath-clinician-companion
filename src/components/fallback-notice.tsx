import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  warnings: string[];
  onDismiss: () => void;
}

/**
 * Compact, collapsible "model fallback" notice.
 * 3 or fewer warnings render inline; more collapse behind a "Show details" toggle.
 */
export function FallbackNotice({ warnings, onDismiss }: Props) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(
    () => [...warnings].sort((a, b) => a.localeCompare(b)),
    [warnings],
  );
  if (sorted.length === 0) return null;

  const compact = sorted.length > 3;

  return (
    <Alert>
      <Info className="h-4 w-4 text-amber-600" />
      <AlertTitle className="flex items-center justify-between gap-3">
        <span>
          {compact
            ? `${sorted.length} optional fields were estimated from population averages`
            : "Model fallback notice"}
        </span>
        <button
          onClick={onDismiss}
          className="text-xs font-normal text-muted-foreground hover:text-foreground shrink-0"
        >
          Dismiss
        </button>
      </AlertTitle>
      <AlertDescription>
        {compact ? (
          <>
            <button
              onClick={() => setOpen((o) => !o)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={open}
            >
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {open ? "Hide details" : "Show details"}
            </button>
            {open && (
              <ul className="mt-2 max-h-[240px] overflow-y-auto list-disc pl-4 space-y-0.5 text-sm pr-2">
                {sorted.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <ul className="list-disc pl-4 space-y-0.5 mt-1 text-sm">
            {sorted.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
