export const TASK_TEXT_MAX = 5000;
export const TASK_FILE_MAX_BYTES = 25 * 1024 * 1024;

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export type TaskValues = { text: string; link: string; file: File | null };
export type TaskErrors = Partial<Record<"text" | "link" | "file" | "form", string>>;

export function validateTask(v: TaskValues, allow: { text: boolean; link: boolean; file: boolean }): TaskErrors {
  const errors: TaskErrors = {};
  if (allow.text && v.text.length > TASK_TEXT_MAX) errors.text = "Keep it under 5,000 characters.";
  if (allow.link && v.link.trim() && !isValidUrl(v.link)) errors.link = "Enter a full link, like https://example.com";
  if (allow.file && v.file && v.file.size > TASK_FILE_MAX_BYTES) errors.file = "That file is over 25 MB. Pick a smaller one.";
  const hasAnswer = (allow.text && v.text.trim()) || (allow.link && v.link.trim()) || (allow.file && v.file);
  if (!hasAnswer && Object.keys(errors).length === 0) errors.form = "Add an answer, or skip the task.";
  return errors;
}
