import type { Metadata } from "next";
import { PipelineScreen, parseTab } from "@/features/pipeline";
import type { Channel } from "@/features/projects";

export const metadata: Metadata = { title: "Board", robots: { index: false, follow: false } };

const CHANNELS: readonly Channel[] = ["email", "sms", "whatsapp"];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProjectPage({ params, searchParams }: PageProps<"/adminMatt/p/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const send = first(sp.send);
  return <PipelineScreen slug={slug} tab={parseTab(sp.tab)} applicantId={first(sp.a)} sendChannel={CHANNELS.find((c) => c === send)} autoPlay={first(sp.play) === "1"} />;
}
