export type CalLinkInput = {
  calLink: string;
  firstName: string;
  lastName: string;
  email: string;
  applicantId: string;
};

/** Personal Cal.com link: prefilled name and email, applicant id in metadata. Every value is URL-encoded. */
export function buildCalLink(i: CalLinkInput): string {
  const q = [
    `name=${encodeURIComponent(`${i.firstName} ${i.lastName}`)}`,
    `email=${encodeURIComponent(i.email)}`,
    `metadata[applicant_id]=${encodeURIComponent(i.applicantId)}`,
  ].join("&");
  return `${i.calLink}${i.calLink.includes("?") ? "&" : "?"}${q}`;
}
