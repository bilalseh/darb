import { getIdToken } from './session';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal | undefined;
}

/** Calls the Darb API, served same-origin under `/api`, with the user's ID token if signed in. */
async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: `/${string}`,
  options: RequestOptions,
) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = await getIdToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: options.body === undefined ? null : JSON.stringify(options.body),
    signal: options.signal ?? null,
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, `${method} /api${path} failed (${response.status})`, body);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function apiGet<T>(path: `/${string}`, options: RequestOptions = {}): Promise<T> {
  return request<T>('GET', path, options);
}

export function apiPost<T>(path: `/${string}`, body?: unknown): Promise<T> {
  return request<T>('POST', path, { body });
}

export function apiPut<T>(path: `/${string}`, body: unknown): Promise<T> {
  return request<T>('PUT', path, { body });
}

export function apiPatch<T>(path: `/${string}`, body: unknown): Promise<T> {
  return request<T>('PATCH', path, { body });
}

export async function apiDelete(path: `/${string}`): Promise<void> {
  await request<undefined>('DELETE', path, {});
}
