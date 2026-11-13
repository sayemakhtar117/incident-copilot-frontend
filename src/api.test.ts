// Runtime validation coverage for: API base URL configuration and error handling.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeStream, api, getApiBase, onUnauthorized, setAccessToken, setApiBase } from './api';

describe('API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
    setAccessToken(null);
  });

  it('trims trailing slashes from a saved API base URL', () => {
    setApiBase('https://api.example.com///');

    expect(getApiBase()).toBe('https://api.example.com');
  });

  it('keeps access tokens out of persistent browser storage', () => {
    setAccessToken('short-lived-token');

    expect(sessionStorage.length).toBe(0);
  });

  it('sends status requests to the configured base URL', async () => {
    const status = { llm: 'test', embedding: 'test', store: 'test', incidents: 3 };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(status), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.status('https://api.example.com')).resolves.toEqual(status);

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/status', expect.any(Object));
    const requestInit = fetchMock.mock.calls[0][1];
    expect(new Headers(requestInit?.headers).get('Content-Type')).toBe('application/json');
  });

  it('uses the API error message when a response is unsuccessful', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Backend is unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.status('https://api.example.com')).rejects.toThrow('Backend is unavailable');
  });

  it('sends the login request and returns its access token', async () => {
    const response = { accessToken: 'signed-token', expiresInSeconds: 300 };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.login('admin@example.com', 'long-enough-password')).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', password: 'long-enough-password' }),
      }),
    );
  });

  it('attaches the bearer token and clears it when the API returns unauthorized', async () => {
    setAccessToken('expired-token');
    const onAuthExpired = vi.fn();
    const unsubscribe = onUnauthorized(onAuthExpired);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ llm: 'test', embedding: 'test', store: 'test', incidents: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.status()).rejects.toMatchObject({ status: 401 });
    expect(onAuthExpired).toHaveBeenCalledOnce();
    const requestInit = fetchMock.mock.calls[0][1];
    expect(new Headers(requestInit?.headers).get('Authorization')).toBe('Bearer expired-token');
    await expect(api.status()).resolves.toMatchObject({ incidents: 0 });
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).has('Authorization')).toBe(false);
    unsubscribe();
  });

  it('authenticates and parses the protected analysis event stream', async () => {
    setAccessToken('signed-token');
    const responsePayload = JSON.stringify({ rootCauseHypothesis: 'Pool exhausted' });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: stage\ndata: {"message":"Searching"}\n\n'));
        controller.enqueue(new TextEncoder().encode(`event: result\ndata: ${responsePayload}\n\n`));
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );
    const onStage = vi.fn();
    const onResult = vi.fn();
    const onError = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    analyzeStream('slow requests', 'payments', { onStage, onResult, onError });

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith({ rootCauseHypothesis: 'Pool exhausted' }));
    expect(onStage).toHaveBeenCalledWith('Searching');
    expect(onError).not.toHaveBeenCalled();
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer signed-token');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Accept')).toBe('text/event-stream');
  });
});
