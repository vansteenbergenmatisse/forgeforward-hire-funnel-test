export type AnswerFields = { taskAllowText: boolean; taskAllowLink: boolean; taskAllowFile: boolean };

/** Plain text of the editor HTML. Images count as content. */
export function taskBodyText(html: string): string {
  if (/<img\b/i.test(html)) return "image";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type TaskErrors = Partial<Record<"title" | "body" | "answers", string>>;

export function validateTask(t: { taskTitle: string; taskBody: string } & AnswerFields): TaskErrors {
  const errors: TaskErrors = {};
  if (t.taskTitle.trim() === "") errors.title = "Give the task a title. Applicants see it first.";
  if (taskBodyText(t.taskBody) === "") errors.body = "Describe the task. Applicants need something to do.";
  if (!t.taskAllowText && !t.taskAllowLink && !t.taskAllowFile) errors.answers = "Turn on at least one way to answer.";
  return errors;
}
