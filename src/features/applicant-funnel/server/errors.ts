/** Thrown inside funnel server code. `handle()` turns it into a JSON response. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message = code,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
