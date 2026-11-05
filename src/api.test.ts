// Runtime validation coverage for: API base URL configuration and error handling.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, getApiBase, setApiBase } from './api';

describe('API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('trims trailing slashes from a saved API base URL', () => {
    setApiBase('https://api.example.com///');

    expect(getApiBase()).toBe('https://api.example.com');
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

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/status',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
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
});
