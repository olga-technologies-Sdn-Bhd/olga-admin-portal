import { describe, expect, it } from 'vitest';
import { validateConfig, type AppConfig } from './config';

const base: AppConfig = {
  environment: 'production',
  apiBaseUrl: 'https://api.olga.example',
  useMocks: false,
  requestTimeoutMs: 15000,
  auth: { mode: 'entra', username: '', passwordSha256: '', sessionMinutes: 480, authority: 'https://login.microsoftonline.com/tid', clientId: 'cid', apiScopes: ['api://x/access_as_user'], requiredRole: 'Olga.Admin' },
};

describe('validateConfig', () => {
  it('accepts a complete production config', () => {
    expect(validateConfig(base)).toEqual([]);
  });

  it('rejects mocks, disabled auth and http API outside local', () => {
    const errors = validateConfig({ ...base, useMocks: true, apiBaseUrl: 'http://api', auth: { ...base.auth, mode: 'none' } });
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('useMocks'), expect.stringContaining('auth.mode'), expect.stringContaining('https'),
    ]));
  });

  it('allows the local defaults', () => {
    expect(validateConfig({ ...base, environment: 'local', apiBaseUrl: '', useMocks: true, auth: { ...base.auth, mode: 'none' } })).toEqual([]);
  });

  it('requires authority and clientId when auth is enabled', () => {
    const errors = validateConfig({ ...base, auth: { ...base.auth, authority: '', clientId: '' } });
    expect(errors).toHaveLength(2);
  });

  it('allows basic auth in dev but not production', () => {
    const basic = { ...base.auth, mode: 'basic' as const, username: 'olgaadmin', passwordSha256: 'a'.repeat(64) };
    expect(validateConfig({ ...base, environment: 'dev', auth: basic })).toEqual([]);
    expect(validateConfig({ ...base, auth: basic })).toEqual([expect.stringContaining('must be "entra" in production')]);
  });

  it('rejects a plain-text password in basic mode', () => {
    const errors = validateConfig({ ...base, environment: 'local', auth: { ...base.auth, mode: 'basic', username: 'u', passwordSha256: 'admin@olga' } });
    expect(errors).toEqual([expect.stringContaining('passwordSha256')]);
  });
});
