// Client-safe rules for the styled intro paragraph. The editor, the server sanitizer and the funnel
// all read these lists, so a value the editor can write is a value the funnel can show.

/** Text colors, named after the tokens in globals.css. The markup stores the name, never a hex value. */
export const INTRO_COLORS = ["signal", "signal-deep", "charcoal", "muted", "blue", "ok", "amber", "purple"] as const;
export type IntroColor = (typeof INTRO_COLORS)[number];

/** Text sizes. No value means the normal size. */
export const INTRO_SIZES = ["sm", "lg", "xl", "huge"] as const;
export type IntroSize = (typeof INTRO_SIZES)[number];

export const INTRO_TEXT_MAX = 2000;
/** Markup cap. Formatting adds tags, so this is far above the text cap. */
export const INTRO_HTML_MAX = 20000;

export const isIntroColor = (v: unknown): v is IntroColor => typeof v === "string" && (INTRO_COLORS as readonly string[]).includes(v);
export const isIntroSize = (v: unknown): v is IntroSize => typeof v === "string" && (INTRO_SIZES as readonly string[]).includes(v);

/** Typography for the intro in the editor and on the first funnel screen. Class names are written out so Tailwind sees them. */
export const INTRO_PROSE = [
  "[&_p]:min-h-[1.5em] [&_p+p]:mt-2 [&_strong]:font-extrabold [&_em]:italic [&_u]:underline",
  "[&_[data-size=sm]]:text-sm [&_[data-size=lg]]:text-xl [&_[data-size=xl]]:text-[26px] [&_[data-size=huge]]:text-[34px]",
  "[&_[data-size=lg]]:leading-snug [&_[data-size=xl]]:leading-tight [&_[data-size=huge]]:leading-tight",
  "[&_[data-color=signal]]:text-signal [&_[data-color=signal-deep]]:text-signal-deep [&_[data-color=charcoal]]:text-charcoal [&_[data-color=muted]]:text-muted",
  "[&_[data-color=blue]]:text-blue [&_[data-color=ok]]:text-ok [&_[data-color=amber]]:text-amber [&_[data-color=purple]]:text-purple",
].join(" ");

/** True when the text contains markup. Older intros are plain text. */
export function introIsHtml(text: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(text);
}

/** Plain text to one paragraph per line, escaped. Markup passes through untouched. */
export function introToHtml(value: string): string {
  if (introIsHtml(value)) return value;
  return value
    .split(/\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("");
}

/** Length of the visible text. Plain text counts as it is. */
export function introVisibleLength(value: string): number {
  if (!introIsHtml(value)) return value.length;
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;|&gt;|&amp;|&quot;/g, "x").length;
}

/** The two caps the server enforces. */
export function introFits(value: string): boolean {
  return value.length <= INTRO_HTML_MAX && introVisibleLength(value) <= INTRO_TEXT_MAX;
}
