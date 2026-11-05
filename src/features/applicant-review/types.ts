import type { Channel } from "@/features/projects";

export type ApplicantDrawerProps = {
  applicantId: string;
  projectSlug: string;
  onClose: () => void;
  /** Opens the send modal on this channel when the drawer mounts (`?send=whatsapp`). */
  initialSendChannel?: Channel;
  /** Starts playback when the drawer opens from a card's play icon (`?play=1`). */
  autoPlay?: boolean;
  /** Localhost triage: arrow keys reject or keep an applicant who is in New, then the screen opens the next one. Left out when off. */
  triage?: {
    /** Missing when the project has no Rejected stage. */
    onReject?: (applicantId: string) => void;
    /** Missing when the project has no "Good profile" stage. */
    onGood?: (applicantId: string) => void;
  };
};
