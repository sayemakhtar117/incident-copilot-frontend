import { useState } from 'react';
import { api, getApiBase, setApiBase } from '../api';
import type { Status } from '../types';

interface Props {
  status: Status | null;
  error: string | null;
  onChanged: () => Promise<void>;
  onClose: () => void;
}

export default function ConnectionPanel({ status, error, onChanged, onClose }: Props) {
  const [url, setUrl] = useState(getApiBase());
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const saveAndTest = async () => {
    const clean = url.trim().replace(/\/+$/, '');
    setTesting(true);
    setMessage(null);
    try {
      const s = await api.status(clean);
      setApiBase(clean);
      await onChanged();
      setMessage({ ok: true, text: `Connected. LLM: ${s.llm}, store: ${s.store}, ${s.incidents} incidents.` });
    } catch (e) {
      setMessage({
        ok: false,
        text: `${e instanceof Error ? e.message : String(e)}. Check the URL, that the backend is awake, and CORS_ALLOWED_ORIGINS on the backend.`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="card popover" role="dialog" aria-label="API connection">
      <div className="result-head">
        <h2>API connection</h2>
        <button className="ghost small" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="muted">
        Leave empty to use the same origin (local dev proxy, or the backend serving this UI). For a separately hosted
        UI, enter the backend URL, e.g. <code>https://incident-copilot.onrender.com</code>.
      </p>
      <label className="field">
        <span>Backend URL</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="(same origin)"
          onKeyDown={(e) => e.key === 'Enter' && saveAndTest()}
        />
      </label>
      <div className="row">
        <button onClick={saveAndTest} disabled={testing}>
          {testing ? 'Testing…' : 'Save and test'}
        </button>
        <button
          className="ghost"
          onClick={() => {
            setUrl('');
          }}
        >
          Use same origin
        </button>
      </div>
      {message && <div className={`banner ${message.ok ? 'ok' : 'error'}`}>{message.text}</div>}
      <p className="muted">Free hosts sleep when idle: the first request after a break can take about a minute.</p>
      {status ? (
        <div className="chips">
          <span className="chip">LLM: {status.llm}</span>
          <span className="chip">Embeddings: {status.embedding}</span>
          <span className="chip">Store: {status.store}</span>
        </div>
      ) : (
        error && <div className="banner error">Not connected: {error}</div>
      )}
    </div>
  );
}
