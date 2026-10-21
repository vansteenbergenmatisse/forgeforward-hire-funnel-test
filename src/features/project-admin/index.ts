// Public API of the project-admin feature: the Projects home screen and the projects store.
export { ProjectsHome } from "./ui/projects-home";
export { useProjects } from "./store";
export type { ProjectRecord, UnmatchedBooking, SystemAlert } from "./types";
export { slugify, uniqueSlug, blankProject, duplicateProject } from "./project-factory";
