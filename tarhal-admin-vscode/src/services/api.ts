import axios from 'axios';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// withCredentials: Mohammed's login sets an HTTP-only session cookie, so the browser must send it with each request.
export const api = axios.create({ baseURL: API_BASE_URL, timeout: 8000, withCredentials: true, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token') ?? localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch { /* storage unavailable */ }
  return config;
});

export type Pagination = { page: number; pageSize: number; total: number };
export type Paginated<T> = { success?: boolean; data: T[]; pagination?: Pagination };
export type Envelope<T> = { success?: boolean; data: T };
export type Raw = Record<string, unknown>;

export const pick = (raw: Raw, ...keys: string[]): unknown => { for (const k of keys) if (raw[k] !== undefined && raw[k] !== null) return raw[k]; return undefined; };
export const str = (v: unknown, d = ''): string => (v === undefined || v === null ? d : String(v));
export const num = (v: unknown, d = 0): number => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/** HTTP status of a failed request, or undefined when there was no response (server offline / network). */
export function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/** Reads one message out of the many shapes backends use for errors. Returns undefined when there is nothing usable. */
function messageFrom(value: unknown, field?: string): string | undefined {
  const label = (text: string) => (field ? `${field}: ${text}` : text);
  if (typeof value === 'string') return value.trim() && !value.trimStart().startsWith('<') ? label(value.trim()) : undefined; // ignore HTML error pages
  if (Array.isArray(value)) {
    const parts = value.map((item) => (item && typeof item === 'object' && !Array.isArray(item)
      ? messageFrom((item as Raw).message ?? (item as Raw).msg ?? (item as Raw).error, String((item as Raw).field ?? (item as Raw).path ?? (item as Raw).param ?? field ?? '') || undefined)
      : messageFrom(item, field))).filter(Boolean);
    return parts.length ? parts.join('; ') : undefined;
  }
  if (value && typeof value === 'object') {
    const o = value as Raw;
    const direct = messageFrom(o.message ?? o.msg ?? o.detail ?? o.error ?? o.title);
    if (direct) return direct;
    const parts = Object.entries(o).map(([k, v]) => messageFrom(v, k)).filter(Boolean); // { field: ['msg'] }
    return parts.length ? parts.join('; ') : undefined;
  }
  return undefined;
}

export type ApiErrorInfo = { status?: number; kind: 'server' | 'network' | 'timeout' | 'unknown'; message?: string };

/**
 * Explains a failed request: HTTP status plus the backend's own message when it sent one
 * (`message`, `error`, `detail`, or a validation list in `errors`). `message` is undefined when the
 * server said nothing useful, so the caller can show a translated fallback by status.
 */
export function parseApiError(error: unknown): ApiErrorInfo {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const { data, status } = error.response;
      const body = data && typeof data === 'object' ? (data as Raw) : data;
      const message = messageFrom(body && typeof body === 'object' ? (body.message ?? body.errors ?? body.error ?? body.detail ?? body.title ?? body) : body);
      return { status, kind: 'server', message: message?.slice(0, 300) };
    }
    return { kind: error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ? 'timeout' : 'network' };
  }
  // Thrown by assertWrite below, or any other Error: its message is already meant for people.
  return { kind: 'unknown', message: error instanceof Error && error.message !== 'Request failed' ? error.message : undefined };
}

/** Like assertSuccess, but keeps the backend's explanation when a 200 response says `success: false`. */
export function assertWrite<T extends { success?: boolean }>(body: T): T {
  if (body && body.success === false) throw new Error(messageFrom((body as Raw).message ?? (body as Raw).errors ?? (body as Raw).error) ?? 'Request failed');
  return body;
}

/** Throws if the backend answered `success: false`, so callers fall back like any other failure. */
export function assertSuccess<T extends { success?: boolean }>(body: T): T {
  if (!body || body.success === false) throw new Error('Request failed');
  return body;
}

/** Accepts `data: [...]` as well as `data: { items | results | rows: [...] }`. */
export function toList(body: { data?: unknown }): Raw[] {
  const d = body?.data as unknown;
  if (Array.isArray(d)) return d as Raw[];
  const o = (d ?? {}) as Raw;
  for (const k of ['items', 'results', 'rows', 'data']) if (Array.isArray(o[k])) return o[k] as Raw[];
  return [];
}

/** Short, human-readable reason a request failed (shown next to the Demo data badge and logged). */
export function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response) return `HTTP ${error.response.status}`;
    return error.code === 'ECONNABORTED' ? 'Timeout' : 'Server unreachable / CORS';
  }
  return error instanceof Error ? error.message : 'Unknown error';
}
