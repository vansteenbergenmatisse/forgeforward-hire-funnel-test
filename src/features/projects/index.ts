// Client-safe entrypoint: types, defaults and front-end fixtures. Server-only code lives in ./server.
export { DEFAULT_STAGES, DEFAULT_THANK_YOU, DEFAULT_TEMPLATE, APPOINTMENT_SETTER, BLANK_PROJECT_DEF } from "./defaults";
export { MOCK_PROJECT, MOCK_STAGES, MOCK_QUESTIONS, MOCK_TEMPLATES } from "./mock";
export { SLUG_MAX, RESERVED_SLUGS, validateSlug, slugify, uniqueSlug } from "./slug";
export { normalizeCalLink } from "./cal-link";
export type { ProjectBundle, ProjectRecordDto, StageColor, StageRole, StageDef, QuestionType, QuestionDef, Channel, TemplateDef, ProjectDef } from "./types";
export { INTRO_COLORS, INTRO_SIZES, INTRO_TEXT_MAX, INTRO_HTML_MAX, INTRO_PROSE, isIntroColor, isIntroSize, introIsHtml, introToHtml, introVisibleLength, introFits } from "./intro-format";
export type { IntroColor, IntroSize } from "./intro-format";
