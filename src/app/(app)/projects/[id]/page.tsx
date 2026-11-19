import type { Metadata } from "next";
import { ProjectView } from "@/features/projects/project-view";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  return <ProjectView id={id} />;
}
