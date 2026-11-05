const STEPS = ['Redact', 'Retrieve', 'Investigate', 'Validate'];

/** Maps the backend's stage messages onto the four visual steps. */
export function stageIndex(message: string): number {
  if (/redact/i.test(message)) return 0;
  if (/embed|similar|search/i.test(message)) return 1;
  return 2;
}

interface Props {
  running: boolean;
  done: boolean;
  failed: boolean;
  active: number;
  log: string[];
  elapsedMs: number;
}

export default function PipelineStepper({ running, done, failed, active, log, elapsedMs }: Props) {
  return (
    <div className="card stepper" aria-live="polite">
      <ol className="steps">
        {STEPS.map((label, i) => {
          let state = 'todo';
          if (done || i < active) state = 'done';
          else if (i === active) state = failed ? 'failed' : running ? 'active' : 'todo';
          return (
            <li key={label} className={`step ${state}`}>
              <span className="dot">{state === 'done' ? '✓' : state === 'failed' ? '!' : i + 1}</span>
              {label}
            </li>
          );
        })}
        <li className="elapsed muted">{(elapsedMs / 1000).toFixed(1)}s</li>
      </ol>
      {log.length > 0 && (
        <ul className="log">
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
