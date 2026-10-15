// Runtime configuration, loaded from /config.json before the app renders.
// The same build artifact is deployed to every environment; only config.json differs.

export type Environment = 'local' | 'dev' | 'staging' | 'production';

/**
 * none  - no login (local development only)
 * basic - single fixed username/password checked in the browser. NOT real security:
 *         anything shipped to the browser can be read. Allowed in local/dev only.
 * entra - Microsoft Entra ID sign-in with app-role check. Required in staging/production.
 */
export type AuthMode = 'none' | 'basic' | 'entra';

export interface AuthConfig {
  mode: AuthMode;
  /** basic mode */
  username: string;
  /** basic mode: hex SHA-256 of the password (never store the plain password) */
  passwordSha256: string;
  /** basic mode: session length in minutes */
  sessionMinutes: number;
  /** e.g. https://login.microsoftonline.com/<tenant-id> or https://<tenant>.ciamlogin.com/ */
  authority: string;
  clientId: string;
  /** Delegated scopes requested for Olga.Core, e.g. api://<api-client-id>/access_as_user */
  apiScopes: string[];
  /** App role that must be present in the ID token's `roles` claim. Empty = any signed-in user. */
  requiredRole: string;
}

export interface AppConfig {
  environment: Environment;
  /** Olga.Core base URL without trailing slash. Empty = same origin (local Vite proxy). */
  apiBaseUrl: string;
  useMocks: boolean;
  requestTimeoutMs: number;
  auth: AuthConfig;
}

const defaults: AppConfig = {
  environment: 'local',
  apiBaseUrl: '',
  useMocks: true,
  requestTimeoutMs: 15_000,
  auth: {
    mode: 'none', username: '', passwordSha256: '', sessionMinutes: 480,
    authority: '', clientId: '', apiScopes: [], requiredRole: 'Olga.Admin',
  },
};

let current: AppConfig | null = null;

export function config(): AppConfig {
  if (!current) throw new Error('Config accessed before loadConfig() completed');
  return current;
}

export function validateConfig(c: AppConfig): string[] {
  const errors: string[] = [];
  if (!['local', 'dev', 'staging', 'production'].includes(c.environment)) errors.push(`Unknown environment "${c.environment}"`);
  const { auth } = c;
  if (!['none', 'basic', 'entra'].includes(auth.mode)) errors.push(`Unknown auth.mode "${auth.mode}"`);
  if (c.environment !== 'local') {
    if (c.useMocks) errors.push('useMocks must be false outside local');
    if (auth.mode === 'none') errors.push('auth.mode "none" is only allowed in local');
    if (!c.apiBaseUrl.startsWith('https://')) errors.push('apiBaseUrl must be an https URL outside local');
  }
  if ((c.environment === 'staging' || c.environment === 'production') && auth.mode !== 'entra') {
    errors.push(`auth.mode must be "entra" in ${c.environment}`);
  }
  if (auth.mode === 'basic') {
    if (!auth.username) errors.push('auth.username is required in basic mode');
    if (!/^[0-9a-f]{64}$/i.test(auth.passwordSha256)) errors.push('auth.passwordSha256 must be a 64-char hex SHA-256');
  }
  if (auth.mode === 'entra') {
    if (!c.auth.authority) errors.push('auth.authority is required when auth is enabled');
    if (!c.auth.clientId) errors.push('auth.clientId is required when auth is enabled');
    if (!c.useMocks && c.auth.apiScopes.length === 0) errors.push('auth.apiScopes is required when calling the live API');
  }
  return errors;
}

export async function loadConfig(): Promise<AppConfig> {
  // In dev, a gitignored public/config.local.json overrides config.json.
  let res = import.meta.env.DEV ? await fetch('/config.local.json', { cache: 'no-store' }) : null;
  if (!res?.ok || !res.headers.get('content-type')?.includes('json')) res = await fetch('/config.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load /config.json (HTTP ${res.status})`);
  const raw = (await res.json()) as Partial<AppConfig>;
  const merged: AppConfig = {
    ...defaults,
    ...raw,
    apiBaseUrl: (raw.apiBaseUrl ?? '').replace(/\/$/, ''),
    auth: { ...defaults.auth, ...raw.auth },
  };
  const errors = validateConfig(merged);
  if (errors.length) throw new Error(`Invalid configuration:\n- ${errors.join('\n- ')}`);
  current = merged;
  return merged;
}

/** Test helper. */
export function setConfigForTests(c: Partial<AppConfig>) {
  current = { ...defaults, ...c, auth: { ...defaults.auth, ...c.auth } };
}
