import { ProjectSettings, parseTab } from "@/features/project-settings";

export default async function SettingsPage({ params, searchParams }: PageProps<"/adminMatt/p/[slug]/settings">) {
  const { slug } = await params;
  const { tab } = await searchParams;
  return <ProjectSettings slug={slug} tab={parseTab(tab)} />;
}
