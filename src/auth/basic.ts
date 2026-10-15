// Fixed-credential login for local/dev. The check runs in the browser, so this is a
// convenience gate only; config validation blocks it in staging/production.
import { config } from '../config';

const SESSION_KEY = 'olga-admin.session';
const LOCK_KEY = 'olga-admin.lock';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 30_000;

export interface BasicSession { username: string; expiresAt: number }

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string compare to avoid leaking match length through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function read<T>(key: string): T | null {
  try { return JSON.parse(sessionStorage.getItem(key) ?? 'null') as T | null; } catch { return null; }
}
function write(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
function remove(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* storage unavailable */ }
}

export function currentBasicSession(): BasicSession | null {
  const s = read<BasicSession>(SESSION_KEY);
  if (!s || s.expiresAt <= Date.now()) { remove(SESSION_KEY); return null; }
  return s;
}

/** Milliseconds until the lockout ends, or 0 when not locked. */
export function lockRemaining(): number {
  const lock = read<{ failures: number; until: number }>(LOCK_KEY);
  return lock && lock.until > Date.now() ? lock.until - Date.now() : 0;
}

export type LoginResult = { ok: true; session: BasicSession } | { ok: false; reason: 'invalid' | 'locked'; retryInMs?: number };

export async function basicLogin(username: string, password: string): Promise<LoginResult> {
  const locked = lockRemaining();
  if (locked) return { ok: false, reason: 'locked', retryInMs: locked };

  const { auth } = config();
  const userOk = safeEqual(username.trim().toLowerCase(), auth.username.toLowerCase());
  const passOk = safeEqual(await sha256Hex(password), auth.passwordSha256.toLowerCase());

  if (userOk && passOk) {
    remove(LOCK_KEY);
    const session = { username: auth.username, expiresAt: Date.now() + auth.sessionMinutes * 60_000 };
    write(SESSION_KEY, session);
    return { ok: true, session };
  }

  const prev = read<{ failures: number; until: number }>(LOCK_KEY);
  const failures = (prev?.failures ?? 0) + 1;
  if (failures >= MAX_ATTEMPTS) {
    write(LOCK_KEY, { failures: 0, until: Date.now() + LOCK_MS });
    return { ok: false, reason: 'locked', retryInMs: LOCK_MS };
  }
  write(LOCK_KEY, { failures, until: 0 });
  return { ok: false, reason: 'invalid' };
}

export function basicLogout() {
  remove(SESSION_KEY);
}
