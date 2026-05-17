import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Calendar,
  Pill,
  FileText,
  AlertCircle,
  Car,
  Smartphone,
  Languages,
  Home,
  Users,
  Video,
  UserCheck,
  Activity,
  Stethoscope,
  Hospital,
  PhoneCall,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRiskBand, type RiskBand, type RiskBandId } from "@/lib/riskBands";
import { cn } from "@/lib/utils";

interface Action {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  timing: string;
}

const ACTIONS: Record<RiskBandId, Action[]> = {
  low: [
    { icon: Phone, text: "Post-discharge satisfaction call within 7 days", timing: "within 7d" },
    { icon: Calendar, text: "Routine follow-up appointment within 30 days", timing: "within 30d" },
    { icon: Pill, text: "Medication list reconciled, printed copy given to patient", timing: "at discharge" },
    { icon: FileText, text: "Discharge instructions reviewed with patient + family", timing: "at bedside" },
    { icon: AlertCircle, text: "Patient educated on warning signs requiring re-evaluation", timing: "ongoing" },
  ],
  moderate: [
    { icon: Phone, text: "Phone outreach within 48–72 hours by discharge RN", timing: "48–72h" },
    { icon: Calendar, text: "Follow-up appointment within 7–14 days", timing: "within 7–14d" },
    { icon: Pill, text: "Pharmacist review of high-risk meds (anticoagulants, insulin, opioids)", timing: "at discharge" },
    { icon: Car, text: "Confirm reliable transportation plan for follow-up", timing: "at discharge" },
    { icon: Smartphone, text: "Patient portal enrolled for symptom self-reporting", timing: "at discharge" },
    { icon: Languages, text: "Discharge instructions reviewed in patient's preferred language", timing: "at bedside" },
  ],
  high: [
    { icon: Phone, text: "Care coordinator phone outreach within 24–48 hours", timing: "within 24–48h" },
    { icon: Calendar, text: "In-person follow-up appointment within 7 days", timing: "within 7d" },
    { icon: Home, text: "Home health referral — assessment within 48–72 hours", timing: "within 48–72h" },
    { icon: Pill, text: "Clinical pharmacist med reconciliation before discharge", timing: "before discharge" },
    { icon: Users, text: "Care manager assigned, weekly touch points for 30 days", timing: "ongoing" },
    { icon: Video, text: "Telehealth symptom check at days 3, 7, 14, 21", timing: "days 3/7/14/21" },
    { icon: UserCheck, text: "Confirm caregiver presence + capability at home", timing: "at discharge" },
  ],
  very_high: [
    { icon: Phone, text: "Care coordinator visit within 24 hours of discharge", timing: "within 24h" },
    { icon: Home, text: "In-home nursing assessment within 24–48 hours", timing: "within 24–48h" },
    { icon: Activity, text: "Daily symptom check (telehealth or phone) for first 14 days", timing: "daily for 14 days" },
    { icon: Pill, text: "Pharmacist-led med rec with patient + caregiver present", timing: "before discharge" },
    { icon: Stethoscope, text: "Specialist follow-up within 5 days (cardiology, pulmonology, etc., based on primary diagnosis chapter)", timing: "within 5d" },
    { icon: Hospital, text: "Consider transitional care unit admission if available", timing: "consider" },
    { icon: PhoneCall, text: "24/7 nurse hotline number provided in writing to patient + caregiver", timing: "24/7" },
    { icon: Users, text: "Multidisciplinary case conference within 72 hours", timing: "within 72h" },
  ],
};

export function CarePathwayCard({ probability }: { probability: number | null }) {
  const band: RiskBand | null = probability === null ? null : getRiskBand(probability);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5" />
            Recommended Care Pathway
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-2 max-w-xl">
            Evidence-based actions for{" "}
            <span className="font-medium text-foreground">{band ? band.label : "—"}</span>{" "}
            risk patients. Adapt to your institution's protocols.
          </p>
        </div>
        {band && (
          <Badge variant="outline" className={cn("border", band.badgeClass, "shrink-0")}>
            {band.label}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {!band ? (
          <div className="text-sm text-muted-foreground italic py-6 text-center">
            Score a patient to see recommended actions.
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.ol
              key={band.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-2.5"
            >
              {ACTIONS[band.id].map((a, i) => {
                const Icon = a.icon;
                return (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-md border bg-card/60 px-3 py-2.5"
                  >
                    <div
                      className={cn(
                        "h-8 w-8 shrink-0 rounded-full flex items-center justify-center",
                        band.badgeClass,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-sm text-foreground/90 leading-snug">
                      <span className="text-muted-foreground font-mono text-[10px] tabular-nums mr-1.5">
                        {i + 1}.
                      </span>
                      {a.text}
                    </div>
                    <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider rounded-md px-2 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap">
                      {a.timing}
                    </span>
                  </li>
                );
              })}
            </motion.ol>
          </AnimatePresence>
        )}
        <p className="mt-4 text-xs italic text-slate-500 dark:text-slate-500">
          Recommendations derived from Project RED, IHI Better Outcomes by Optimizing Safe
          Transitions (BOOST), and AHA transitional care guidance. Customize for your institution's
          protocols.
        </p>
      </CardContent>
    </Card>
  );
}
