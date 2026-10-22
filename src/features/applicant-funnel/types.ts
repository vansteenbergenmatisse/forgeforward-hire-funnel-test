import type { ProjectDef, QuestionDef } from "@/features/projects";

/** Everything the funnel needs to render a project. */
export type FunnelProject = ProjectDef & { questions: QuestionDef[] };

export type FunnelSession = { applicantId: string; resumeToken: string };

export type StartPayload = {
  projectSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountry?: string;
  whatsappOk: boolean;
  timezone: string;
  consent: true;
  answers: Record<string, string | number | boolean | string[]>;
  utm: Record<string, string>;
  inAppBrowser: boolean;
  website?: string; // honeypot
};

export type UploadUrls = { key: string; putUrl: string; thumbKey?: string; thumbPutUrl?: string };

/** Boundary between the funnel UI and the server. `mock-api.ts` and `http-api.ts` implement it. */
export interface FunnelApi {
  start(input: StartPayload, idempotencyKey: string): Promise<FunnelSession>;
  getUploadUrls(args: {
    resumeToken: string;
    kind: "video" | "task";
    mime: string;
    filename?: string;
    withThumb: boolean;
    /** Size of the file about to be sent, so the server can sign for exactly that size. */
    bytes: number;
    thumbBytes?: number;
  }): Promise<UploadUrls>;
  completeVideo(args: {
    resumeToken: string;
    key: string;
    thumbKey?: string;
    mime: string;
    bytes: number;
    seconds: number;
    audioOnly: boolean;
    retakeUsed: boolean;
  }): Promise<void>;
  submitTask(
    args: { resumeToken: string; skip: boolean; text?: string; link?: string; fileKey?: string },
    idempotencyKey: string,
  ): Promise<{ stage: "entry_new" | "entry_task" }>;
  createHandoff(args: { resumeToken: string }): Promise<{ url: string; expiresAt: string }>;
  log(event: { type: string; data?: Record<string, unknown> }): Promise<void>;
}

/** Contract between funnel core (worker F1) and the video flow (worker F2). */
export type VideoFlowProps = {
  project: FunnelProject;
  session: FunnelSession;
  api: FunnelApi;
  inAppBrowser: boolean;
  /** True when the page reopened with a saved recording that still needs uploading ("Finish saving your video"). */
  resumeUpload?: boolean;
  /** Called after the server confirmed the video (HEAD + byte count). */
  onUploaded: () => void;
  /** Dev review helper: force a prototype screen state. */
  debugState?: "A04" | "A05" | "A06" | "A07" | "A08" | "A09" | "A10" | "A11" | "A12" | "A13";
};
