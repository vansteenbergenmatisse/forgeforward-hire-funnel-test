export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Same-origin JSON call to /api/admin/*. The admin cookie goes along. Throws AdminApiError with the server's message. */
export async function adminFetch<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown, init?: { keepalive?: boolean }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      keepalive: init?.keepalive,
    });
  } catch {
    throw new AdminApiError(0, "network", "Could not reach the server. Check your connection.");
  }
  const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  if (!res.ok) throw new AdminApiError(res.status, data?.error ?? "error", data?.message ?? "Something went wrong.");
  return data as T;
}
