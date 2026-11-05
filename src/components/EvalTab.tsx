import { useState } from 'react';
import { api } from '../api';
import type { EvalReport } from '../types';

function Metric({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="metric">
      <div className="muted">{label}</div>
      <strong>{value.toFixed(2)}</strong>
      <div className="gauge good">
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function EvalTab() {
  const [report, setReport] = useState<EvalReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlyMisses, setOnlyMisses] = useState(false);
  const [open, setOpen] = useState<Set<number>>(new Set());

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      setReport(await api.eval());
      setOpen(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const toggle = (i: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const rows = report ? report.results.map((r, i) => ({ r, i })).filter(({ r }) => !onlyMisses || r.rank !== 1) : [];

  return (
    <div className="stack">
      <div className="card">
        <div className="result-head">
          <div>
            <h2>Retrieval evaluation</h2>
            <p className="muted">
              Replays labelled alerts through the vector search and checks whether the right past incident comes back.
              Re-run it after changing the embedding model or top-k.
            </p>
          </div>
          <button onClick={run} disabled={running}>
            {running ? 'Running…' : report ? 'Run again' : 'Run evaluation'}
          </button>
        </div>
        {error && <div className="banner error">{error}</div>}
      </div>

      {report && (
        <div className="card">
          <div className="metrics">
            <Metric label="hit@1" value={report.hitAt1} />
            <Metric label="hit@3" value={report.hitAt3} />
            <Metric label="MRR" value={report.mrr} />
          </div>
          <div className="chips">
            <span className="chip">{report.cases} labelled alerts</span>
            <span className="chip">embeddings: {report.embedding}</span>
            <span className="chip">store: {report.store}</span>
          </div>
          <label className="check">
            <input type="checkbox" checked={onlyMisses} onChange={(e) => setOnlyMisses(e.target.checked)} /> Show only
            cases that were not ranked first
          </label>
          <ul className="evals">
            {rows.map(({ r, i }) => (
              <li key={i}>
                <button className="source" onClick={() => toggle(i)} aria-expanded={open.has(i)}>
                  <span>
                    <strong>{r.expected}</strong>
                    <span className="muted block">{r.alert.length > 100 ? r.alert.slice(0, 100) + '…' : r.alert}</span>
                  </span>
                  <span className={r.rank === 1 ? 'cited' : r.rank ? 'warn-text' : 'err-text'}>
                    {r.rank ? `rank ${r.rank}` : 'missed'}
                  </span>
                </button>
                {open.has(i) && (
                  <div className="eval-detail">
                    <div className="muted">Full alert</div>
                    <p>{r.alert}</p>
                    <div className="muted">Retrieved (best first)</div>
                    <div className="chips">
                      {r.retrieved.map((id) => (
                        <span key={id} className={`chip ${id === r.expected ? 'hit' : ''}`}>
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
            {rows.length === 0 && <li className="muted">Every case ranked first.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
