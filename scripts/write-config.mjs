// Writes dist/config.json and dist/staticwebapp.config.json for one environment from env vars.
// Used by the deploy workflow; values come from the GitHub Environment (dev / production).
import { readFileSync, writeFileSync } from 'node:fs';

const required = ['ADMIN_ENVIRONMENT', 'ADMIN_API_BASE_URL', 'ADMIN_AUTH_AUTHORITY', 'ADMIN_AUTH_CLIENT_ID', 'ADMIN_AUTH_API_SCOPES'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required variables: ${missing.join(', ')}`);
  process.exit(1);
}

const env = process.env;
const apiBaseUrl = env.ADMIN_API_BASE_URL.replace(/\/$/, '');
if (!apiBaseUrl.startsWith('https://')) {
  console.error('ADMIN_API_BASE_URL must be https');
  process.exit(1);
}

const config = {
  environment: env.ADMIN_ENVIRONMENT,
  apiBaseUrl,
  useMocks: false,
  requestTimeoutMs: Number(env.ADMIN_REQUEST_TIMEOUT_MS || 15000),
  auth: {
    mode: 'entra',
    authority: env.ADMIN_AUTH_AUTHORITY,
    clientId: env.ADMIN_AUTH_CLIENT_ID,
    apiScopes: env.ADMIN_AUTH_API_SCOPES.split(/[\s,]+/).filter(Boolean),
    requiredRole: env.ADMIN_AUTH_REQUIRED_ROLE ?? 'Olga.Admin',
  },
};
writeFileSync('dist/config.json', JSON.stringify(config, null, 2));

const swa = readFileSync('staticwebapp.config.json', 'utf8').replace('__API_ORIGIN__', new URL(apiBaseUrl).origin);
writeFileSync('dist/staticwebapp.config.json', swa);

console.log(`Wrote config for "${config.environment}" -> ${apiBaseUrl}`);
