/** What deleting a project removes. Shown live in the confirmation dialog. */
export type DeletionCounts = {
  applicants: number;
  /** Videos, thumbnails and task files the database points at. Stray uploads are swept as well. */
  files: number;
  stages: number;
  questions: number;
  templates: number;
  messages: number;
};

export type DeletionPreview = { slug: string; name: string; deleting: boolean; counts: DeletionCounts };

export type DeletionResult = {
  /** True when the project row is gone. False means call again: the time budget ran out or a file could not be deleted. */
  done: boolean;
  /** False when the slug is unknown (already deleted). */
  found: boolean;
  removed: { applicants: number; files: number };
  failed: number;
  remaining: DeletionCounts | null;
};
