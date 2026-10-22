export const TASK_TEXT_MAX = 5000;
export const TASK_FILE_MAX_BYTES = 25 * 1024 * 1024;

/** File types the server accepts for a task answer. Keep in step with TASK_MIMES in server/uploads.ts. */
export const TASK_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** Value for the file input's accept attribute. */
export const TASK_FILE_ACCEPT = Object.keys(TASK_FILE_TYPES)
  .map((e) => `.${e}`)
  .join(",");

export const TASK_FILE_TYPE_MESSAGE = "Use a PDF, Word file, text file, PNG, JPG or WebP.";

function extensionOf(name: string): string {
  const dot = (name ?? "").lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/** The mime type to send for a picked file. Empty browser types fall back to the extension, never to a generic binary type. */
export function taskFileMime(file: { name: string; type: string }): string | null {
  const byExt = TASK_FILE_TYPES[extensionOf(file.name)];
  if (!byExt) return null;
  return file.type && Object.values(TASK_FILE_TYPES).includes(file.type) ? file.type : byExt;
}

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
  if (allow.file && v.file && taskFileMime(v.file) === null) errors.file = TASK_FILE_TYPE_MESSAGE;
  else if (allow.file && v.file && v.file.size > TASK_FILE_MAX_BYTES) errors.file = "That file is over 25 MB. Pick a smaller one.";
  const hasAnswer = (allow.text && v.text.trim()) || (allow.link && v.link.trim()) || (allow.file && v.file);
  if (!hasAnswer && Object.keys(errors).length === 0) errors.form = "Add an answer, or skip the task.";
  return errors;
}
