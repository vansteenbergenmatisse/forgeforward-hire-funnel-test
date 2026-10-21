"use client";

import type { ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/shared/cn";

/** Drag handle: a real button, so Space then arrow keys reorder without a pointer. */
function Handle({ label, attributes, listeners, disabled }: { label: string; attributes: object; listeners?: object; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-subtle hover:bg-sand hover:text-charcoal active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-[18px]" aria-hidden />
    </button>
  );
}

export function SortableRow({ id, handleLabel, className, children }: { id: string; handleLabel: string; className?: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("list-none", isDragging && "relative z-10 rounded-lg bg-white shadow-lift ring-2 ring-charcoal", className)}
    >
      {children(<Handle label={handleLabel} attributes={attributes} listeners={listeners} />)}
    </li>
  );
}

/** Vertical sortable list. Pointer and keyboard sensors. `onMove` gets the dragged id and the id it landed on. */
export function SortableList({ ids, onMove, label, children, className }: { ids: string[]; onMove: (activeId: string, overId: string) => void; label: string; children: ReactNode; className?: string }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id) onMove(String(e.active.id), String(e.over.id));
  }
  return (
    <DndContext id={`sortable-${label}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul aria-label={label} className={className}>
          {children}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
