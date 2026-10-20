import { useLive } from '../data/liveContext';

export function LiveNotice({ empty = false }: { empty?: boolean }) {
  const { error, loading, incidents } = useLive();
  if (error) return <div className="empty-state" role="status"><h2>Backend unavailable</h2><p>FamilyCare cannot reach the live incident service. Check that FastAPI is running. The last received incidents may be shown below.</p></div>;
  if (loading && !incidents.length) return <div className="empty-state" role="status"><h2>Checking live incidents</h2><p>Connecting to FamilyCare…</p></div>;
  if (empty) return <div className="empty-state" role="status"><h2>No incidents recorded</h2><p>The backend has no fall incidents for Puan Aisha yet.</p></div>;
  return null;
}
