import type { Metadata } from "next";
import { PhasesView } from "@/features/phases/phases-view";

export const metadata: Metadata = { title: "Phases" };

export default function PhasesPage() {
  return <PhasesView />;
}
