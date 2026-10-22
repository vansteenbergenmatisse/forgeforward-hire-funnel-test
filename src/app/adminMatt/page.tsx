import type { Metadata } from "next";
import { ProjectsHome } from "@/features/project-admin";

export const metadata: Metadata = { title: "Projects", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <ProjectsHome />;
}
