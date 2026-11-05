import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { Incident, NewIncident } from '../types';

const EMPTY: NewIncident = { title: '', service: '', severity: 'SEV3', symptoms: '', rootCause: '', resolution: '' };

interface Props {
  incidents: Incident[];
  draft: NewIncident | null;
  onDraftUsed: () => void;
  onAdded: () => Promise<void>;
  onOpen: (id: string) => void;
  notify: (message: string) => void;
}

export default function KnowledgeTab({ incidents, draft, onDraftUsed, onAdded, onOpen, notify }: Props) {
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('ALL');
  const [form, setForm] = useState<NewIncident>(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft) {
      setForm(draft);
      setFormOpen(true);
      onDraftUsed();
    }
  }, [draft, onDraftUsed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents.filter(
      (i) =>
        (severity === 'ALL' || i.severity === severity) &&
        (!q || [i.id, i.title, i.service, i.symptoms, i.rootCause, i.resolution].join(' ').toLowerCase().includes(q)),
    );
  }, [incidents, query, severity]);

  const set = (key: keyof NewIncident) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const missing = (['title', 'service', 'symptoms', 'rootCause', 'resolution'] as const).filter(
      (k) => !form[k].trim(),
    );
    if (missing.length) {
      setError(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api.addIncident(form);
      await onAdded();
      setForm(EMPTY);
      setFormOpen(false);
      notify(`Saved ${created.id}. It is now searchable.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      <div className="card">
        <div className="row wrap">
          <input
            className="grow"
            placeholder="Search incidents by any text…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search incidents"
          />
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity filter">
            <option value="ALL">All severities</option>
            <option>SEV1</option>
            <option>SEV2</option>
            <option>SEV3</option>
          </select>
          <button onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'Close form' : 'Add incident'}</button>
        </div>
        <div className="muted">
          Showing {filtered.length} of {incidents.length}
        </div>
      </div>

      {formOpen && (
        <form className="card" onSubmit={submit}>
          <h2>New resolved incident</h2>
          <p className="muted">
            Text is redacted by the server and embedded, so future similar alerts can retrieve it.
          </p>
          <div className="row wrap">
            <label className="field grow">
              <span>Title</span>
              <input value={form.title} onChange={set('title')} maxLength={200} />
            </label>
            <label className="field">
              <span>Service</span>
              <input value={form.service} onChange={set('service')} maxLength={100} />
            </label>
            <label className="field">
              <span>Severity</span>
              <select value={form.severity} onChange={set('severity')}>
                <option>SEV1</option>
                <option>SEV2</option>
                <option>SEV3</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Symptoms</span>
            <textarea value={form.symptoms} onChange={set('symptoms')} maxLength={3000} />
          </label>
          <label className="field">
            <span>Root cause</span>
            <textarea value={form.rootCause} onChange={set('rootCause')} maxLength={2000} />
          </label>
          <label className="field">
            <span>Resolution</span>
            <textarea value={form.resolution} onChange={set('resolution')} maxLength={2000} />
          </label>
          {error && <div className="banner error">{error}</div>}
          <div className="row">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save incident'}
            </button>
            <button type="button" className="ghost" onClick={() => setForm(EMPTY)}>
              Reset
            </button>
          </div>
        </form>
      )}

      <ul className="incident-list">
        {filtered.map((i) => (
          <li key={i.id} className="card">
            <button className="source" onClick={() => onOpen(i.id)}>
              <span>
                <strong>{i.id}</strong> {i.title}
                <span className="muted block">
                  {i.service} · {i.occurredOn}
                </span>
              </span>
              <span className={`sev ${i.severity}`}>{i.severity}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="muted">No incidents match.</li>}
      </ul>
    </div>
  );
}
