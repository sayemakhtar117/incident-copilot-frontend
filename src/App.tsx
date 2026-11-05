import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { useLocalStorage } from './hooks';
import type { Incident, NewIncident, Status } from './types';
import AnalyzeTab from './components/AnalyzeTab';
import ConnectionPanel from './components/ConnectionPanel';
import EvalTab from './components/EvalTab';
import KnowledgeTab from './components/KnowledgeTab';
import SourceDrawer from './components/SourceDrawer';

type Tab = 'analyze' | 'knowledge' | 'eval';
type Theme = 'auto' | 'light' | 'dark';

const TABS: { id: Tab; label: string }[] = [
  { id: 'analyze', label: 'Analyze' },
  { id: 'knowledge', label: 'Knowledge base' },
  { id: 'eval', label: 'Evaluation' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('analyze');
  const [status, setStatus] = useState<Status | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewIncident | null>(null);
  const [showConn, setShowConn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useLocalStorage<Theme>('copilot.theme', 'auto');

  useEffect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  const refresh = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([api.status(), api.incidents()]);
      setStatus(s);
      setIncidents(list);
      setConnError(null);
    } catch (e) {
      setStatus(null);
      setConnError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const services = useMemo(() => [...new Set(incidents.map((i) => i.service))].sort(), [incidents]);
  const openIncident = incidents.find((i) => i.id === drawerId);
  const clearDraft = useCallback(() => setDraft(null), []);

  const saveDraft = (d: NewIncident) => {
    setDraft(d);
    setTab('knowledge');
    notify('Draft prepared from the analysis. Review it and save.');
  };

  const connected = status !== null;

  return (
    <div className="app">
      <header>
        <div>
          <h1>AI Incident Copilot</h1>
          <p className="muted">Redact, retrieve similar incidents, investigate with tools, get a cited fix.</p>
        </div>
        <div className="row">
          <button className="ghost small" onClick={() => setTheme(theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto')}>
            Theme: {theme}
          </button>
          <button className="conn" onClick={() => setShowConn((s) => !s)} aria-expanded={showConn}>
            <span className={`led ${checked ? (connected ? 'on' : 'off') : ''}`} />
            {!checked ? 'Connecting…' : connected ? `Connected · ${status.incidents} incidents` : 'Offline'}
          </button>
        </div>
      </header>

      {showConn && (
        <ConnectionPanel status={status} error={connError} onChanged={refresh} onClose={() => setShowConn(false)} />
      )}

      {checked && !connected && !showConn && (
        <div className="banner error">
          Can't reach the API ({connError}).{' '}
          <button className="link" onClick={() => setShowConn(true)}>
            Fix connection
          </button>
        </div>
      )}

      {status && (
        <div className="chips">
          <span className="chip">LLM: {status.llm}</span>
          <span className="chip">Embeddings: {status.embedding}</span>
          <span className="chip">Store: {status.store}</span>
        </div>
      )}

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        <div hidden={tab !== 'analyze'}>
          <AnalyzeTab services={services} onOpenSource={setDrawerId} onSaveDraft={saveDraft} />
        </div>
        {tab === 'knowledge' && (
          <KnowledgeTab
            incidents={incidents}
            draft={draft}
            onDraftUsed={clearDraft}
            onAdded={refresh}
            onOpen={setDrawerId}
            notify={notify}
          />
        )}
        {tab === 'eval' && <EvalTab />}
      </main>

      <SourceDrawer id={drawerId} incident={openIncident} onClose={() => setDrawerId(null)} />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
