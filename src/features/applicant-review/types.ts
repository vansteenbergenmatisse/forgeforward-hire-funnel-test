import type { Channel } from "@/features/projects";

export type ApplicantDrawerProps = {
  applicantId: string;
  projectSlug: string;
  onClose: () => void;
  /** Opens the send modal on this channel when the drawer mounts (`?send=whatsapp`). */
  initialSendChannel?: Channel;
  /** Starts playback when the drawer opens from a card's play icon (`?play=1`). */
  autoPlay?: boolean;
};
