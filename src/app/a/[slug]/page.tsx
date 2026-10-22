import type { Metadata } from "next";
import { DevReview, FunnelFlow, FunnelNotice, parseDevStep, parseSim, pickTracking } from "@/features/applicant-funnel";
import { getFunnelProject } from "@/features/applicant-funnel/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Apply | Forge Forward" };

export default async function ApplyPage({ params, searchParams }: PageProps<"/a/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const project = await getFunnelProject(slug);

  if (!project) return <FunnelNotice title="This page does not exist." />;
  // A closed project still opens for people who are mid-flow (spec G12). The flow shows the closed notice to everyone else.

  const tracking = pickTracking(query);
  // Test hooks (?sim, ?step, ?video=stub) are off in production unless ENABLE_DEV_ROUTES=1 (for end-to-end runs on a production build).
  const devRoutes = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_ROUTES === "1";
  const sim = devRoutes ? parseSim(query.sim) : null;
  const devStep = devRoutes ? parseDevStep(query.step) : null;

  const videoStub = devRoutes && query.video === "stub";

  if (devStep) return <DevReview step={devStep} project={project} tracking={tracking} sim={sim} />;
  return <FunnelFlow project={project} tracking={tracking} sim={sim} videoStub={videoStub} />;
}
