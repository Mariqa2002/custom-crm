import type { Metadata } from "next";
import { ReportsView } from "@/features/reports/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const { generate } = await searchParams;
  return <ReportsView autoGenerate={generate === "1"} />;
}
