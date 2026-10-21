import { eq } from "drizzle-orm";
import { db, tables } from "@/platform/db";
import {
  APPOINTMENT_SETTER,
  DEFAULT_STAGES,
  DEFAULT_TEMPLATE,
  DEFAULT_THANK_YOU,
  paragraphDoc,
} from "./defaults";

/** Creates the Appointment Setter project with every default. Skips when the slug exists. */
export async function seedAppointmentSetter(): Promise<{ created: boolean; projectId: string }> {
  const d = db();
  const existing = await d
    .select({ id: tables.projects.id })
    .from(tables.projects)
    .where(eq(tables.projects.slug, APPOINTMENT_SETTER.slug));
  if (existing[0]) return { created: false, projectId: existing[0].id };

  return d.transaction(async (tx) => {
    const [project] = await tx
      .insert(tables.projects)
      .values({
        slug: APPOINTMENT_SETTER.slug,
        name: APPOINTMENT_SETTER.name,
        intro: APPOINTMENT_SETTER.intro,
        videoPrompt: APPOINTMENT_SETTER.videoPrompt,
        taskEnabled: true,
        taskTitle: APPOINTMENT_SETTER.taskTitle,
        taskContent: paragraphDoc(APPOINTMENT_SETTER.taskText),
        thankYouText: DEFAULT_THANK_YOU,
      })
      .returning({ id: tables.projects.id });

    await tx.insert(tables.stages).values(
      DEFAULT_STAGES.map((s, position) => ({ ...s, position, projectId: project.id })),
    );
    await tx.insert(tables.projectQuestions).values({
      projectId: project.id,
      label: APPOINTMENT_SETTER.question.label,
      type: "single_choice",
      options: [...APPOINTMENT_SETTER.question.options],
      required: true,
      position: 0,
    });
    await tx.insert(tables.messageTemplates).values(
      (["email", "sms", "whatsapp"] as const).map((channel, position) => ({
        projectId: project.id,
        channel,
        name: DEFAULT_TEMPLATE.name,
        subject: channel === "email" ? DEFAULT_TEMPLATE.subject : "",
        body: DEFAULT_TEMPLATE.body,
        waTemplateName: channel === "whatsapp" ? "interview_invite" : null,
        waLanguage: channel === "whatsapp" ? "en" : null,
        waVariables: channel === "whatsapp" ? ["first_name", "cal_link"] : [],
        position,
      })),
    );
    return { created: true, projectId: project.id };
  });
}
