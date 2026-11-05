import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { analyzeStream } from '../api';
import { useLocalStorage } from '../hooks';
import type { Analysis, HistoryItem, NewIncident } from '../types';
import PipelineStepper, { stageIndex } from './PipelineStepper';
import ResultCard from './ResultCard';

const SAMPLES = [
  {
    label: 'DB pool exhausted',
    service: 'payment-service',
    alert:
      "Checkout API returning 500s. Logs show 'HikariPool-1 Connection is not available, request timed out after 30000ms' for user jane@example.com, token=abc123secret.",
  },
  {
    label: 'Out of memory',
    service: 'order-service',
    alert: 'OutOfMemoryError Java heap space, pod restarted several times, heap usage keeps climbing.',
  },
  {
    label: 'Kafka lag',
    service: 'inventory-service',
    alert: 'Kafka consumer lag keeps growing and partitions keep rebalancing, CommitFailedException about poll interval.',
  },
  {
    label: '401 spike',
    service: 'auth-service',
    alert: 'Sudden surge of 401 responses, tokens fail signature verification after the identity provider rotated keys.',
  },
];

interface Props {
  services: string[];
  onOpenSource: (id: string) => void;
  onSaveDraft: (draft: NewIncident) => void;
}

export default function AnalyzeTab({ services, onOpenSource, onSaveDraft }: Props) {
  const [alertText, setAlertText] = useState('');
  const [service, setService] = useState('');
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<Analysis | null>(null);
  const [resultAlert, setResultAlert] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('copilot.history', []);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(t);
  }, [running, startedAt]);

  useEffect(() => () => cancelRef.current?.(), []);

  const run = () => {
    const text = alertText.trim();
    if (!text || running) return;
    const svc = service.trim();
    setRunning(true);
    setError(null);
    setResult(null);
    setLog([]);
    setActive(0);
    setElapsed(0);
    setStartedAt(Date.now());
    setResultAlert(text);
    cancelRef.current = analyzeStream(text, svc, {
      onStage: (message) => {
        setLog((l) => [...l, message]);
        setActive(stageIndex(message));
      },
      onResult: (r) => {
        setResult(r);
        setRunning(false);
        setActive(3);
        setHistory((h) =>
          [{ id: Date.now(), at: new Date().toISOString(), alert: text, service: svc, result: r }, ...h].slice(0, 10),
        );
      },
      onError: (message) => {
        setError(message);
        setRunning(false);
      },
    });
  };

  const cancel = () => {
    cancelRef.current?.();
    setRunning(false);
    setLog((l) => [...l, 'Cancelled by user']);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run();
  };

  const saveDraft = () => {
    if (!result) return;
    const firstLine = resultAlert.split(/[.\n]/)[0].trim();
    onSaveDraft({
      title: firstLine.slice(0, 90) || 'New incident',
      service: result.service === 'unknown' ? '' : result.service,
      severity: 'SEV3',
      symptoms: resultAlert,
      rootCause: result.rootCauseHypothesis,
      resolution: result.remediationSteps.join(' '),
    });
  };

  const loadHistory = (item: HistoryItem) => {
    setAlertText(item.alert);
    setService(item.service);
    setResult(item.result);
    setResultAlert(item.alert);
    setLog([]);
    setError(null);
    setRunning(false);
  };

  const showStepper = running || log.length > 0 || error !== null;

  return (
    <div className="stack">
      <div className="card">
        <label className="field">
          <span>Alert or symptoms</span>
          <textarea
            value={alertText}
            onChange={(e) => setAlertText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Paste an alert, a log excerpt or a description of what you see…"
            maxLength={4000}
          />
        </label>
        <div className="row">
          <label className="field grow">
            <span>Service (optional)</span>
            <input
              list="service-list"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="e.g. payment-service"
            />
            <datalist id="service-list">
              {services.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          {running ? (
            <button className="danger" onClick={cancel}>
              Cancel
            </button>
          ) : (
            <button onClick={run} disabled={!alertText.trim()}>
              Analyze <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
            </button>
          )}
        </div>
        <div className="row wrap">
          <span className="muted">Try a sample:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              className="ghost small"
              onClick={() => {
                setAlertText(s.alert);
                setService(s.service);
              }}
            >
              {s.label}
            </button>
          ))}
          <span className="muted right">{alertText.length}/4000</span>
        </div>
      </div>

      {showStepper && (
        <PipelineStepper
          running={running}
          done={result !== null && !running}
          failed={error !== null}
          active={active}
          log={log}
          elapsedMs={elapsed}
        />
      )}
      {error && <div className="banner error">{error}</div>}
      {result && (
        <ResultCard
          key={result.meta.latencyMs + result.rootCauseHypothesis}
          result={result}
          alert={resultAlert}
          onOpenSource={onOpenSource}
          onSaveAsIncident={saveDraft}
        />
      )}

      {history.length > 0 && (
        <div className="card">
          <div className="result-head">
            <h2>Recent analyses</h2>
            <button className="ghost small" onClick={() => setHistory([])}>
              Clear
            </button>
          </div>
          <ul className="history">
            {history.map((h) => (
              <li key={h.id}>
                <button className="source" onClick={() => loadHistory(h)}>
                  <span>
                    {h.alert.length > 110 ? h.alert.slice(0, 110) + '…' : h.alert}
                    <span className="muted block">
                      {h.result.service} · {new Date(h.at).toLocaleString()}
                    </span>
                  </span>
                  <span className="muted">{Math.round(h.result.confidence * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
