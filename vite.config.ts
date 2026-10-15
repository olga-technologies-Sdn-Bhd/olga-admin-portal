/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Dev-only proxy so the browser calls same-origin paths and Olga.Core needs no CORS setup.
  const target = env.CORE_API_PROXY_TARGET || 'http://localhost:5000';
  const proxy = Object.fromEntries(['/v1', '/ready', '/health'].map((p) => [p, { target, changeOrigin: true }]));

  return {
    plugins: [react()],
    define: { __APP_VERSION__: JSON.stringify(`${pkg.version}+${env.GITHUB_SHA?.slice(0, 7) ?? 'local'}`) },
    server: { port: 5173, proxy },
    build: { sourcemap: 'hidden' },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
