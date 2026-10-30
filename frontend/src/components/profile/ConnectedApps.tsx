import { useCallback, useEffect, useState } from 'react';
import { Laptop, Loader2 } from 'lucide-react';
import { ApiError, ConnectedApp, deviceAuthApi } from '../../api/client';

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

// Desktop apps / CLIs signed in with "Sign in with Loopin", with a way to remove them
export function ConnectedApps() {
  const [apps, setApps] = useState<ConnectedApp[] | null>(null);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setApps(await deviceAuthApi.listApps());
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load connected apps');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (app: ConnectedApp) => {
    if (!confirm(`Sign out "${app.name}"? It will have to sign in again.`)) return;
    setRemoving(app.id);
    try {
      await deviceAuthApi.revokeApp(app.id);
      setApps((prev) => (prev ?? []).filter((a) => a.id !== app.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove the app');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="bg-[#111418] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 space-y-4">
      <h2 className="text-sm font-bold text-[#ECEAE4] uppercase tracking-wider">Connected apps</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {apps === null && !error && <Loader2 className="animate-spin text-[#5EE6B0]" size={18} />}
      {apps?.length === 0 && (
        <p className="text-sm text-[#8A9099]">No apps signed in. Use “Sign in to Loopin” in the desktop app to add one.</p>
      )}
      <ul className="space-y-3">
        {apps?.map((app) => (
          <li key={app.id} className="flex items-center gap-3 text-sm">
            <Laptop size={15} className="text-[#5B616A] shrink-0" />
            <div className="min-w-0">
              <div className="text-[#ECEAE4] truncate">{app.name}</div>
              <div className="text-xs text-[#5B616A]">
                Signed in {when(app.createdAt)}{app.lastUsedAt ? ` · last used ${when(app.lastUsedAt)}` : ''}
              </div>
            </div>
            <button
              onClick={() => void remove(app)}
              disabled={removing === app.id}
              className="ml-auto text-xs px-2.5 py-1.5 rounded-lg text-[#8A9099] hover:text-red-400 hover:bg-red-950/30 disabled:opacity-50"
            >
              {removing === app.id ? 'Removing…' : 'Sign out'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
