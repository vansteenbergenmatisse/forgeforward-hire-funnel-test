/** Thrown by any FunnelApi implementation. `network` is true when the request never reached the server. */
export class FunnelApiError extends Error {
  readonly network: boolean;
  readonly status: number | null;

  constructor(message: string, opts: { network?: boolean; status?: number | null } = {}) {
    super(message);
    this.name = "FunnelApiError";
    this.network = opts.network ?? false;
    this.status = opts.status ?? null;
  }
}

export const NETWORK_MESSAGE = "We could not save that. Check your connection and tap Next again.";
export const SERVER_MESSAGE = "Something went wrong on our side. Please try again in a moment.";
