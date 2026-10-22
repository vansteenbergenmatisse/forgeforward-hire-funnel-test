// Client-safe entrypoint: types, defaults and front-end fixtures. Server-only code lives in ./server.
export { DEFAULT_STAGES, DEFAULT_THANK_YOU, DEFAULT_TEMPLATE, APPOINTMENT_SETTER, BLANK_PROJECT_DEF } from "./defaults";
export { MOCK_PROJECT, MOCK_STAGES, MOCK_QUESTIONS, MOCK_TEMPLATES } from "./mock";
export { SLUG_MAX, RESERVED_SLUGS, validateSlug, slugify, uniqueSlug } from "./slug";
export { normalizeCalLink } from "./cal-link";
export type { ProjectBundle, ProjectRecordDto, StageColor, StageRole, StageDef, QuestionType, QuestionDef, Channel, TemplateDef, ProjectDef } from "./types";
