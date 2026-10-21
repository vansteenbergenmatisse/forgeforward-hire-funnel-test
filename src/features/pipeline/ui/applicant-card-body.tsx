import { Clock } from "lucide-react";
import type { QuestionDef, StageDef } from "@/features/projects";
import { localTimeLabel, type ApplicantView } from "@/features/applicants";
import { Badge } from "@/components/ui";
import { cn } from "@/shared/cn";
import { cardBadges } from "../logic/card-badges";
import { cardAnswerLine } from "../logic/card-text";
import { CountryChip } from "./country-chip";
import { ScoreStars } from "./score-stars";
import { Thumbnail } from "./thumbnail";

/** Card contents (D04). Pure display: the draggable wrapper and the drag overlay both render it. */
export function ApplicantCardBody({ applicant: a, stages, question, now }: { applicant: ApplicantView; stages: StageDef[]; question: QuestionDef | null; now: Date }) {
  const badges = cardBadges(a, stages, now);
  const line = cardAnswerLine(a, question);
  return (
    <>
      {a.unreadReply && (
        <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-signal">
          <span className="sr-only">Unread reply</span>
        </span>
      )}
      <span className="flex gap-2.5">
        <Thumbnail applicant={a} />
        <span className={cn("flex min-w-0 flex-col gap-[3px]", a.unreadReply && "pr-3")}>
          <span className="flex items-center gap-1 whitespace-nowrap text-sm font-bold text-charcoal">
            <span className="min-w-0 truncate">
              {a.firstName} {a.lastName}
            </span>
            <CountryChip code={a.phoneCountry} />
          </span>
          <span className="flex items-center gap-1 text-xs text-muted">
            <Clock className="size-3 shrink-0" aria-hidden />
            <span suppressHydrationWarning>{localTimeLabel(a.timezone, now)}</span>
          </span>
          {line && <span className="text-xs text-muted">{line}</span>}
          {a.score !== null && <ScoreStars score={a.score} className="mt-px" />}
        </span>
      </span>
      {badges.length > 0 && (
        <span className="mt-2 flex flex-wrap gap-1">
          {badges.map((b) => (
            <Badge key={b.key} tone={b.tone} className="h-[22px] text-xs">
              <span suppressHydrationWarning>{b.text}</span>
            </Badge>
          ))}
        </span>
      )}
    </>
  );
}
