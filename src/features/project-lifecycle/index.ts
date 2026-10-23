// Client-safe entrypoint of the project-lifecycle feature: deactivate, reactivate and delete a project. Server code is in ./server.
export type { DeletionCounts, DeletionPreview, DeletionResult } from "./types";
export { ProjectActions } from "./ui/project-actions";
export { ProjectStatusControl, ProjectDangerZone } from "./ui/lifecycle-section";
export { LifecycleToaster } from "./ui/toast";
export { useProjectLifecycle } from "./ui/use-lifecycle";
