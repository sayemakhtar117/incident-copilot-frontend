import type { Analysis, EvalReport, Incident, NewIncident, Status } from './types';

const BASE_KEY = 'copilot.apiBase';

export interface AuthToken {
  accessToken: string;
  expiresInSeconds: number;
}

let accessToken: string | null = null;
const unauthorizedListeners = new Set<() => void>();

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Order of precedence: value saved from the in-app settings panel, then VITE_API_BASE_URL, then same origin. */
export function getApiBase(): string {
  try {
    const saved = localStorage.getItem(BASE_KEY);
    if (saved !== null) return saved;
  } catch {
    /* storage unavailable */
  }
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
}

export function setApiBase(value: string): void {
  try {
    localStorage.setItem(BASE_KEY, value.trim().replace(/\/+$/, ''));
  } catch {
    /* storage unavailable */
  }
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function clearUnauthorizedToken(): void {
  setAccessToken(null);
  unauthorizedListeners.forEach((listener) => listener());
}

async function request<T>(path: string, init?: RequestInit, baseOverride?: string): Promise<T> {
  const base = baseOverride ?? getApiBase();
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const res = await fetch(base + path, {
    ...init,
    headers,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error || body?.detail) message = body.error ?? body.detail;
    } catch {
      /* not JSON */
    }
    if (res.status === 401) clearUnauthorizedToken();
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthToken>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  status: (baseOverride?: string) => request<Status>('/api/status', undefined, baseOverride),
  incidents: () => request<Incident[]>('/api/incidents'),
  addIncident: (body: NewIncident) =>
    request<Incident>('/api/incidents', { method: 'POST', body: JSON.stringify(body) }),
  eval: () => request<EvalReport>('/api/eval'),
};

export interface StreamHandlers {
  onStage: (message: string) => void;
  onResult: (result: Analysis) => void;
  onError: (message: string) => void;
}

/** Opens the SSE stream. Returns a function that cancels it. */
export function analyzeStream(alert: string, service: string, h: StreamHandlers): () => void {
  const query = new URLSearchParams({ alert, service });
  let finished = false;
  const controller = new AbortController();
  const finish = () => {
    finished = true;
    controller.abort();
  };

  const handleFrame = (frame: string) => {
    let event = 'message';
    const data: string[] = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (!data.length) return;

    const payload = JSON.parse(data.join('\n'));
    if (event === 'stage') h.onStage(payload.message);
    else if (event === 'result') {
      h.onResult(payload as Analysis);
      finish();
    } else if (event === 'error') {
      h.onError(payload.message);
      finish();
    }
  };

  void (async () => {
    try {
      const headers = new Headers();
      headers.set('Accept', 'text/event-stream');
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
      const response = await fetch(`${getApiBase()}/api/analyze/stream?${query}`, {
        headers,
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 401) clearUnauthorizedToken();
        let message = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          message = body?.error ?? body?.detail ?? message;
        } catch {
          /* not JSON */
        }
        throw new ApiError(message, response.status);
      }
      if (!response.body) throw new Error('The server did not provide an event stream.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          handleFrame(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
        }
      }
      if (!finished && buffer.trim()) handleFrame(buffer);
      if (!finished) h.onError('The analysis stream ended before returning a result.');
    } catch (error) {
      if (!finished && !(error instanceof DOMException && error.name === 'AbortError')) {
        h.onError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      finished = true;
    }
  })();

  return finish;
}
