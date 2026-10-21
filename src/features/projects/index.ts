// Client-safe entrypoint: types, defaults and front-end fixtures. Server-only code lives in ./server.
export { DEFAULT_STAGES, DEFAULT_THANK_YOU, DEFAULT_TEMPLATE, APPOINTMENT_SETTER } from "./defaults";
export { MOCK_PROJECT, MOCK_STAGES, MOCK_QUESTIONS, MOCK_TEMPLATES } from "./mock";
export type { StageColor, StageRole, StageDef, QuestionType, QuestionDef, Channel, TemplateDef, ProjectDef } from "./types";
