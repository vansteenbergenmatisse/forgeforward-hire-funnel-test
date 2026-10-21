import {
  KeyboardCode,
  closestCorners,
  pointerWithin,
  rectIntersection,
  type Announcements,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import type { StageDef } from "@/features/projects";
import type { ApplicantView } from "@/features/applicants";
import { CARD_PREFIX, STAGE_PREFIX } from "../logic/drag-end";

const ROW_STEP = 40;
/** Column padding. A moved card lands this far inside the next column. */
const COLUMN_PAD = 10;

/** Left and right jump to the neighbouring column, up and down nudge within it. */
export const coordinateGetter: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  const { x, y } = currentCoordinates;
  if (event.code === KeyboardCode.Down) return { x, y: y + ROW_STEP };
  if (event.code === KeyboardCode.Up) return { x, y: y - ROW_STEP };
  if (event.code !== KeyboardCode.Left && event.code !== KeyboardCode.Right) return undefined;

  const { droppableRects, droppableContainers, collisionRect } = context;
  if (!collisionRect) return undefined;
  const columns = droppableContainers
    .getEnabled()
    .filter((c) => String(c.id).startsWith(STAGE_PREFIX))
    .map((c) => droppableRects.get(c.id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .sort((a, b) => a.left - b.left);
  if (columns.length === 0) return undefined;

  const centre = collisionRect.left + collisionRect.width / 2;
  const current = columns.findIndex((r) => centre >= r.left && centre <= r.left + r.width);
  const from = current === -1 ? 0 : current;
  const target = columns[Math.min(columns.length - 1, Math.max(0, from + (event.code === KeyboardCode.Right ? 1 : -1)))];
  return { x: target.left + COLUMN_PAD, y: Math.max(y, target.top + COLUMN_PAD) };
};

/** Pointer: the column under the cursor. Keyboard has no pointer, so use the column the moved card overlaps most. */
export const detectColumn: CollisionDetection = (args) => {
  const columns = args.droppableContainers.filter((c) => String(c.id).startsWith(STAGE_PREFIX));
  const scoped = { ...args, droppableContainers: columns };
  const hits = pointerWithin(scoped);
  if (hits.length > 0) return hits;
  const overlap = rectIntersection(scoped);
  return overlap.length > 0 ? overlap : closestCorners(scoped);
};

export const screenReaderInstructions: ScreenReaderInstructions = {
  draggable: "To pick up this card, press Space. Use the left and right arrow keys to choose a stage, then press Space to drop it. Press Escape to cancel.",
};

export function buildAnnouncements(applicants: ApplicantView[], stages: StageDef[]): Announcements {
  const name = (id: string | number) => {
    const a = applicants.find((x) => `${CARD_PREFIX}${x.id}` === String(id));
    return a ? `${a.firstName} ${a.lastName}` : "Card";
  };
  const stageName = (id: string | number | undefined) => {
    if (id === undefined) return null;
    const s = String(id);
    if (!s.startsWith(STAGE_PREFIX)) return null;
    return stages.find((x) => x.id === s.slice(STAGE_PREFIX.length))?.name ?? null;
  };
  return {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const to = stageName(over?.id);
      return to ? `${name(active.id)} is over ${to}.` : `${name(active.id)} is not over a stage.`;
    },
    onDragEnd: ({ active, over }) => {
      const to = stageName(over?.id);
      return to ? `Dropped ${name(active.id)} in ${to}.` : `Dropped ${name(active.id)}. It stays where it was.`;
    },
    onDragCancel: ({ active }) => `Move cancelled. ${name(active.id)} stays where it was.`,
  };
}
