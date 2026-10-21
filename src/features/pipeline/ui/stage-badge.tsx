import type { StageDef } from "@/features/projects";
import { Badge } from "@/components/ui";

export function StageBadge({ stage }: { stage: StageDef | undefined }) {
  if (!stage) return <Badge tone="gray">Unknown stage</Badge>;
  return (
    <Badge tone={stage.color} dot>
      {stage.name}
    </Badge>
  );
}
