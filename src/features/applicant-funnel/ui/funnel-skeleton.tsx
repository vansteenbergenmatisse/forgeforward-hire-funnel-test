import { StepBody } from "@/components/funnel";

/** Shown for a moment while the flow reads localStorage. Same rough shape as the form. */
export function FunnelSkeleton() {
  return (
    <StepBody>
      <div aria-busy="true" aria-label="Loading" className="flex animate-pulse flex-col gap-4 motion-reduce:animate-none">
        <div className="h-3 w-40 rounded-sm bg-line" />
        <div className="h-10 w-3/4 rounded-md bg-line" />
        <div className="h-4 w-2/3 rounded-sm bg-line" />
        <div className="mt-6 h-14 rounded-xl bg-line" />
        <div className="h-14 rounded-xl bg-line" />
        <div className="h-14 rounded-xl bg-line" />
      </div>
    </StepBody>
  );
}
