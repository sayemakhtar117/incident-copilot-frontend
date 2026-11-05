import { useEffect } from 'react';
import type { Incident } from '../types';

interface Props {
  id: string | null;
  incident: Incident | undefined;
  onClose: () => void;
}

export default function SourceDrawer({ id, incident, onClose }: Props) {
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, onClose]);

  if (!id) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`Incident ${id}`}>
        <div className="result-head">
          <h2>{id}</h2>
          <button className="ghost small" onClick={onClose}>
            Close (Esc)
          </button>
        </div>
        {incident ? (
          <>
            <h3>{incident.title}</h3>
            <div className="chips">
              <span className="chip">{incident.service}</span>
              <span className="chip">{incident.severity}</span>
              <span className="chip">{incident.occurredOn}</span>
            </div>
            <h2>Symptoms</h2>
            <p>{incident.symptoms}</p>
            <h2>Root cause</h2>
            <p>{incident.rootCause}</p>
            <h2>Resolution</h2>
            <p>{incident.resolution}</p>
          </>
        ) : (
          <p className="muted">This incident is not in the knowledge base the API returned.</p>
        )}
      </aside>
    </>
  );
}
