import { readTaskContent } from "@/features/projects/server";

/** task_content is `{ html }` (what the Task settings tab saves), an HTML string or Tiptap JSON. The projects feature sanitizes all three. */
export function taskContentToHtml(content: unknown): string {
  return readTaskContent(content);
}
