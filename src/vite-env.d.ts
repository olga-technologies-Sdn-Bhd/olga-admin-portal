/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
/** Where the local dev proxy sends API calls: dev, production, or local (CORE_API_PROXY_TARGET). */
declare const __API_TARGET__: { name: 'local' | 'dev' | 'production'; url: string };
