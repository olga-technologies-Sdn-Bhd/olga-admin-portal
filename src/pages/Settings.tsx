import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthGate';
import { config } from '../config';
import { PageHeader } from '../components/ui';

export function Settings() {
  const { environment, apiBaseUrl, useMocks, auth } = config();
  const { user } = useAuth();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await fetch(`${apiBaseUrl}/ready`, { signal: AbortSignal.timeout(5000) })).ok,
    retry: false,
  });

  return (
    <>
      <PageHeader title="Settings" subtitle="Environment and connectivity" />
      <section className="card">
        <div className="field"><label>Environment</label><span>{environment}</span></div>
        <div className="field"><label>Core API URL</label><code>{apiBaseUrl || '(same origin, via dev proxy)'}</code></div>
        <div className="field"><label>Data source</label><span>{useMocks ? 'Mock data' : 'Live API'}</span></div>
        <div className="field">
          <label>Core API readiness</label>
          <span className={health.data ? undefined : 'error'}>
            {health.isLoading ? 'Checking…' : health.data ? 'Ready' : 'Unreachable'}
          </span>
        </div>
        <div className="field">
          <label>Authentication</label>
          <span>{{ none: 'Disabled (local only)', basic: 'Fixed username/password (local/dev only)', entra: 'Microsoft Entra ID' }[auth.mode]}{user && `, signed in as ${user.username}`}</span>
        </div>
        <div className="field"><label>App version</label><code>{__APP_VERSION__}</code></div>
      </section>
    </>
  );
}
