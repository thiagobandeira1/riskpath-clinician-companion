import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Command as CommandIcon,
  Target,
  LayoutGrid,
  BarChart3,
  ScrollText,
  Settings as SettingsIcon,
  Sun,
  RotateCw,
  Shuffle,
  User,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useTheme } from "@/components/theme-provider";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Patient } from "@/lib/types";
import { getChapterLabel } from "@/lib/featureLabels";

export function CommandPalette({
  open,
  setOpen,
  onAction,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onAction?: (id: "random" | "repredict" | "reexplain") => void;
}) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { data: examples } = useQuery({
    queryKey: ["examples", 5],
    queryFn: () => api.getExamples(5),
    staleTime: Infinity,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };
  const act = (id: "random" | "repredict" | "reexplain") => {
    setOpen(false);
    onAction?.(id);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/predict")}>
            <Target className="mr-2 h-4 w-4" />
            Predict
          </CommandItem>
          <CommandItem onSelect={() => go("/batch")}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Batch Score
          </CommandItem>
          <CommandItem onSelect={() => go("/insights")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Insights
          </CommandItem>
          <CommandItem onSelect={() => go("/model")}>
            <ScrollText className="mr-2 h-4 w-4" />
            Model Card
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => act("random")}>
            <Shuffle className="mr-2 h-4 w-4" />
            Load random example
          </CommandItem>
          <CommandItem onSelect={() => act("repredict")}>
            <CommandIcon className="mr-2 h-4 w-4" />
            Re-predict
          </CommandItem>
          <CommandItem onSelect={() => act("reexplain")}>
            <RotateCw className="mr-2 h-4 w-4" />
            Re-explain
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
          >
            <Sun className="mr-2 h-4 w-4" />
            Toggle theme
          </CommandItem>
        </CommandGroup>
        {examples?.examples?.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Patients">
              {examples.examples.slice(0, 5).map((p: Patient, i) => (
                <CommandItem
                  key={p.id ?? i}
                  onSelect={() => {
                    window.dispatchEvent(
                      new CustomEvent("riskpath:select-patient", { detail: i }),
                    );
                    setOpen(false);
                    navigate({ to: "/predict" });
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  Patient #{i + 1} ·{" "}
                  <span className="ml-1 text-muted-foreground">
                    {getChapterLabel(p.features.primary_dx_chapter as string | null | undefined)} ·{" "}
                    {String(p.features.discharge_location ?? "—")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
