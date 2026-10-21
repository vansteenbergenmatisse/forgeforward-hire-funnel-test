/** A column shows this many cards until "+ N more" is clicked. */
export const COLLAPSED_LIMIT = 4;

export function visibleCards<T>(cards: T[], expanded: boolean, limit: number = COLLAPSED_LIMIT): { visible: T[]; hidden: number } {
  if (expanded || cards.length <= limit) return { visible: cards, hidden: 0 };
  return { visible: cards.slice(0, limit), hidden: cards.length - limit };
}
