/** Clicking the current score clears it; any other star sets it. */
export function nextScore(current: number | null, clicked: number): number | null {
  return current === clicked ? null : clicked;
}

export function scoreLabel(score: number | null): string {
  return score === null ? "Not scored" : `${score} of 5`;
}
