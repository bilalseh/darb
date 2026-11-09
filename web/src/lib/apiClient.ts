export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  signal?: AbortSignal;
}

/** GET a JSON resource from the Darb API, which is served same-origin under `/api`. */
export async function apiGet<T>(path: `/${string}`, { signal }: RequestOptions = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { Accept: 'application/json' },
    signal: signal ?? null,
  });
  if (!response.ok) {
    throw new ApiError(response.status, `GET /api${path} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}
