import type { Analysis, EvalReport, Incident, NewIncident, Status } from './types';

const BASE_KEY = 'copilot.apiBase';

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

async function request<T>(path: string, init?: RequestInit, baseOverride?: string): Promise<T> {
  const base = baseOverride ?? getApiBase();
  const res = await fetch(base + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
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
  const es = new EventSource(`${getApiBase()}/api/analyze/stream?${query}`);
  let finished = false;
  const finish = () => {
    finished = true;
    es.close();
  };
  es.addEventListener('stage', (e) => h.onStage(JSON.parse((e as MessageEvent).data).message));
  es.addEventListener('result', (e) => {
    h.onResult(JSON.parse((e as MessageEvent).data));
    finish();
  });
  es.addEventListener('error', (e) => {
    if (finished) return;
    const data = (e as MessageEvent).data;
    h.onError(data ? JSON.parse(data).message : 'Could not reach the API, or the connection was closed.');
    finish();
  });
  return finish;
}
