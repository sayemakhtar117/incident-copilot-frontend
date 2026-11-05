import { useState } from 'react';
import type { Analysis } from '../types';

interface Props {
  result: Analysis;
  alert: string;
  onOpenSource: (id: string) => void;
  onSaveAsIncident: () => void;
}

function toMarkdown(r: Analysis, alert: string): string {
  return [
    `# Incident analysis: ${r.service}`,
    `**Alert:** ${alert}`,
    `**Hypothesis (${Math.round(r.confidence * 100)}% confidence):** ${r.rootCauseHypothesis}`,
    `## Remediation`,
    ...r.remediationSteps.map((s, i) => `${i + 1}. ${s}`),
    `## Evidence`,
    ...r.evidence.map((e) => `- ${e}`),
    `## Sources`,
    ...r.sources.map((s) => `- ${s.id} ${s.title} (similarity ${s.score.toFixed(2)}${s.cited ? ', cited' : ''})`),
  ].join('\n');
}

export default function ResultCard({ result, alert, onOpenSource, onSaveAsIncident }: Props) {
  const [done, setDone] = useState<boolean[]>(() => result.remediationSteps.map(() => false));
  const [copied, setCopied] = useState(false);
  const pct = Math.round(result.confidence * 100);
  const completed = done.filter(Boolean).length;
  const tone = pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'low';
  const m = result.meta;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(result, alert));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="card result">
      {m.fallbackUsed && (
        <div className="banner warn">The LLM was unavailable, so this answer came from the offline analyst.</div>
      )}
      <div className="result-head">
        <h2>Root-cause hypothesis</h2>
        <div className="actions">
          <button className="ghost small" onClick={copy}>
            {copied ? 'Copied' : 'Copy as Markdown'}
          </button>
          <button className="ghost small" onClick={onSaveAsIncident}>
            Save to knowledge base
          </button>
        </div>
      </div>
      <p className="hypothesis">{result.rootCauseHypothesis}</p>
      <div className={`gauge ${tone}`} role="img" aria-label={`Confidence ${pct}%`}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className="muted">
        Confidence {pct}% · service <strong>{result.service}</strong>
      </div>

      <h2>
        Remediation checklist{' '}
        <span className="muted">
          ({completed}/{result.remediationSteps.length})
        </span>
      </h2>
      <ul className="checklist">
        {result.remediationSteps.map((step, i) => (
          <li key={i} className={done[i] ? 'checked' : ''}>
            <label>
              <input
                type="checkbox"
                checked={done[i] ?? false}
                onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
              />
              <span>{step}</span>
            </label>
          </li>
        ))}
      </ul>

      <h2>Evidence from tools</h2>
      {result.evidence.length ? (
        <ul className="evidence">
          {result.evidence.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : (
        <div className="muted">No live evidence was collected for this service.</div>
      )}

      <h2>Similar past incidents (click to open)</h2>
      {result.sources.length ? (
        <ul className="sources">
          {result.sources.map((s) => (
            <li key={s.id}>
              <button className="source" onClick={() => onOpenSource(s.id)}>
                <span>
                  <strong>{s.id}</strong> {s.title}
                  <span className="muted block">{s.service}</span>
                </span>
                <span className={s.cited ? 'cited' : 'muted'}>
                  {s.cited ? 'cited · ' : ''}
                  {s.score.toFixed(2)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="muted">Nothing above the similarity threshold.</div>
      )}

      <div className="chips">
        <span className="chip">LLM: {m.llm}</span>
        <span className="chip">tools: {result.toolsUsed.join(', ') || 'none'}</span>
        <span className="chip">{m.latencyMs} ms</span>
        <span className="chip">{m.redactions} redaction(s)</span>
        <span className="chip">
          tokens {m.promptTokens}/{m.completionTokens}
        </span>
        {m.cached && <span className="chip">cached</span>}
      </div>
    </div>
  );
}
