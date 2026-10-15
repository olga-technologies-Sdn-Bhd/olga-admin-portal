import { getAccessToken } from '../auth/msal';
import { config } from '../config';

export class ApiError extends Error {
  constructor(public status: number, public code: string, public correlationId: string | null) {
    super(`${status} ${code}`);
    this.name = 'ApiError';
  }
}

export const mocksEnabled = () => config().useMocks;

// Olga.Core speaks snake_case JSON; the UI uses camelCase.
const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
function convertKeys(value: unknown, fn: (k: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => convertKeys(v, fn));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [fn(k), convertKeys(v, fn)]));
  }
  return value;
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { apiBaseUrl, requestTimeoutMs } = config();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // Olga.Core rejects /v1 writes without an idempotency key.
  if (method !== 'GET') headers['Idempotency-Key'] = crypto.randomUUID();
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(convertKeys(body, toSnake)),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === 'TimeoutError';
    throw new ApiError(0, timedOut ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR', null);
  }

  if (!res.ok) {
    let code = res.status === 401 ? 'UNAUTHORIZED' : res.status === 403 ? 'FORBIDDEN' : 'REQUEST_FAILED';
    try {
      const err = await res.json();
      code = err.code ?? err.error ?? code;
    } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, code, res.headers.get('X-Correlation-Id'));
  }
  if (res.status === 204) return undefined as T;
  return convertKeys(await res.json(), toCamel) as T;
}
