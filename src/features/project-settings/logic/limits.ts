/** Text limits the server enforces. The fields stop at the same length, so a long paste cannot be silently dropped on save. */
export const INTRO_MAX = 2000;
export const VIDEO_PROMPT_MAX = 600;
export const THANK_YOU_MAX = 1000;

/** "123 of 2000" for a field hint. */
export function countText(value: string, max: number): string {
  return `${value.length} of ${max}`;
}
