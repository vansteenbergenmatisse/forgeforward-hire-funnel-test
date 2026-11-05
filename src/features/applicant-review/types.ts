import type { Channel } from "@/features/projects";

export type ApplicantDrawerProps = {
  applicantId: string;
  projectSlug: string;
  onClose: () => void;
  /** Opens the send modal on this channel when the drawer mounts (`?send=whatsapp`). */
  initialSendChannel?: Channel;
  /** Kept for the `?play=1` link. The drawer now starts the video on every open. */
  autoPlay?: boolean;
  /** Triage: arrow keys reject or keep an applicant who is in New, then the screen opens the next one. Left out when off. */
  triage?: {
    /** Missing when the project has no Rejected stage. */
    onReject?: (applicantId: string) => void;
    /** Missing when the project has no "Good profile" stage. */
    onGood?: (applicantId: string) => void;
  };
};
