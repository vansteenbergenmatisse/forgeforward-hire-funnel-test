/** Returns a new list with the item that has `activeId` moved to the position of `overId`. */
export function moveById<T extends { id: string }>(list: readonly T[], activeId: string, overId: string): T[] {
  const from = list.findIndex((i) => i.id === activeId);
  const to = list.findIndex((i) => i.id === overId);
  if (from < 0 || to < 0 || from === to) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
