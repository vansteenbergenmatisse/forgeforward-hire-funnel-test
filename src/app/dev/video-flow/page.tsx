import { notFound } from "next/navigation";
import { Harness } from "./harness";

// Dev only test bench for the video flow. 404s in production.
export default async function Page({ searchParams }: PageProps<"/dev/video-flow">) {
  if (process.env.NODE_ENV === "production") notFound();
  const q = await searchParams;
  const one = (k: string) => (Array.isArray(q[k]) ? q[k][0] : q[k]);
  return (
    <Harness
      debugState={one("state")}
      inApp={one("inapp") === "1"}
      resume={one("resume") === "1"}
      prep={Number(one("prep") ?? 0) || undefined}
      max={Number(one("max") ?? 0) || undefined}
      retakes={one("retakes") === undefined ? undefined : Number(one("retakes"))}
    />
  );
}
