"use client";

import { useMemo, useState } from "react";
import { buildCalLink } from "@/features/bookings";
import type { ApplicantView } from "@/features/applicants";
import type { Channel, TemplateDef } from "@/features/projects";
import { prepareMessage } from "../prepare-message";

type ProjectLite = { name: string; calLink: string };

/** Template choice plus the editable text. Switching template re-fills the text. */
export function useDraft(applicant: ApplicantView, project: ProjectLite, templates: TemplateDef[], channel: Channel) {
  const channelTemplates = useMemo(() => templates.filter((t) => t.channel === channel), [templates, channel]);
  const [templateId, setTemplateId] = useState(channelTemplates[0]?.id ?? "");
  const template = channelTemplates.find((t) => t.id === templateId);

  const values = useMemo(
    () => ({
      first_name: applicant.firstName,
      last_name: applicant.lastName,
      project_name: project.name,
      cal_link: project.calLink
        ? buildCalLink({ calLink: project.calLink, firstName: applicant.firstName, lastName: applicant.lastName, email: applicant.email, applicantId: applicant.id })
        : "",
    }),
    [applicant, project],
  );

  const prepared = useMemo(() => (template ? prepareMessage(template, values) : null), [template, values]);

  // Edits are kept per template: `edited` is only used while it belongs to the current template.
  const [edit, setEdit] = useState<{ key: string; body?: string; subject?: string }>({ key: "" });
  const mine = edit.key === templateId ? edit : { key: templateId };
  const filledBody = prepared?.ok ? prepared.body : (template?.body ?? "");
  const filledSubject = prepared?.ok ? prepared.subject : (template?.subject ?? "");

  return {
    channelTemplates,
    templateId,
    template,
    setTemplateId,
    prepared,
    body: mine.body ?? filledBody,
    subject: mine.subject ?? filledSubject,
    setBody: (body: string) => setEdit({ ...mine, key: templateId, body }),
    setSubject: (subject: string) => setEdit({ ...mine, key: templateId, subject }),
  };
}
