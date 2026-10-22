import type { ApplicantView } from "@/features/applicants";
import { eventText, newestFirst } from "../lib/event-text";
import { formatStamp } from "../lib/format";
import { Section } from "./section";

export function TimelineBlock({ a, stageName }: { a: ApplicantView; stageName: (id: string | null) => string }) {
  return (
    <Section title="Timeline">
      {a.detail === false && (
        <p className="text-sm text-muted" role="status">Loading the timeline...</p>
      )}
      <ol className="space-y-3 border-l border-line-strong pl-4">
        {newestFirst(a.events).map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-ivory bg-charcoal" aria-hidden />
            <p className="text-sm font-semibold text-charcoal">{eventText(e, stageName)}</p>
            <time dateTime={e.at} className="text-[13px] text-muted">{formatStamp(e.at)}</time>
          </li>
        ))}
      </ol>
    </Section>
  );
}
