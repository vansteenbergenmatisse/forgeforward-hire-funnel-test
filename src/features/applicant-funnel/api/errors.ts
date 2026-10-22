/** Thrown by any FunnelApi implementation. `network` is true when the request never reached the server. */
export class FunnelApiError extends Error {
  readonly network: boolean;
  readonly status: number | null;
  /** Server error code such as rate_limited, closed or invalid. */
  readonly code: string | null;
  /** Field messages from the server, keyed like `q:<questionId>` or `firstName`. */
  readonly fields: Record<string, string>;

  constructor(
    message: string,
    opts: { network?: boolean; status?: number | null; code?: string | null; fields?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = "FunnelApiError";
    this.network = opts.network ?? false;
    this.status = opts.status ?? null;
    this.code = opts.code ?? null;
    this.fields = opts.fields ?? {};
  }
}

export const NETWORK_MESSAGE = "We could not save that. Check your connection and tap Next again.";
export const SERVER_MESSAGE = "Something went wrong on our side. Please try again in a moment.";
export const INVALID_MESSAGE = "Check your answers and try again.";

type ErrorBody = { error?: unknown; message?: unknown; fields?: unknown };

/**
 * Turns a failed response into a FunnelApiError. Only 4xx bodies carry text meant for the applicant
 * (rate limit, closed role, field errors). A 5xx always shows the generic message.
 */
export function errorFromResponse(status: number, body: unknown): FunnelApiError {
  const b = (body && typeof body === "object" ? body : {}) as ErrorBody;
  const code = typeof b.error === "string" ? b.error : null;
  const fields: Record<string, string> = {};
  if (b.fields && typeof b.fields === "object") {
    for (const [k, v] of Object.entries(b.fields)) if (typeof v === "string") fields[k] = v;
  }
  if (status >= 500 || status < 400) return new FunnelApiError(SERVER_MESSAGE, { status, code });
  let message = SERVER_MESSAGE;
  if (typeof b.message === "string" && b.message && b.message !== code) message = b.message;
  else if (status === 400 && code === "invalid") message = INVALID_MESSAGE;
  else if (status === 429) message = "Too many tries. Wait a few minutes and try again.";
  return new FunnelApiError(message, { status, code, fields });
}
