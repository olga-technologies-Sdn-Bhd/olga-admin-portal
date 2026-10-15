import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ApiError } from './api/client';
import { AuthGate } from './auth/AuthGate';
import { initAuth, login } from './auth/msal';
import { config, loadConfig } from './config';
import { Layout } from './components/Layout';
import { ConfirmProvider, ErrorBoundary, ToastProvider } from './components/feedback';
import { applyTheme, storedTheme } from './components/ThemeToggle';
import './styles.css';

const page = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const Dashboard = page(() => import('./pages/Dashboard'), 'Dashboard');
const Members = page(() => import('./pages/Members'), 'Members');
const Events = page(() => import('./pages/Events'), 'Events');
const Venues = page(() => import('./pages/Venues'), 'Venues');
const Moderation = page(() => import('./pages/Moderation'), 'Moderation');
const Privacy = page(() => import('./pages/Privacy'), 'Privacy');
const Settings = page(() => import('./pages/Settings'), 'Settings');
const NotFound = page(() => import('./pages/NotFound'), 'NotFound');

function createQueryClient() {
  const onAuthError = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401 && config().auth.mode === 'entra') void login();
  };
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Don't retry client errors; retry transient ones once.
        retry: (count, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 1,
      },
    },
    queryCache: new QueryCache({ onError: onAuthError }),
    mutationCache: new MutationCache({ onError: onAuthError }),
  });
}

applyTheme(storedTheme());

const root = createRoot(document.getElementById('root')!);

async function bootstrap() {
  try {
    await loadConfig();
    await initAuth();
  } catch (e) {
    root.render(
      <div className="center-screen">
        <div className="card auth-card">
          <h1>Olga Admin couldn't start</h1>
          <pre className="error pre">{e instanceof Error ? e.message : String(e)}</pre>
        </div>
      </div>,
    );
    return;
  }

  const queryClient = createQueryClient();
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <AuthGate>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <ConfirmProvider>
                <BrowserRouter>
                  <Routes>
                    <Route element={<Layout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="members" element={<Members />} />
                      <Route path="events" element={<Events />} />
                      <Route path="venues" element={<Venues />} />
                      <Route path="moderation" element={<Moderation />} />
                      <Route path="privacy" element={<Privacy />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </ConfirmProvider>
            </ToastProvider>
          </QueryClientProvider>
        </AuthGate>
      </ErrorBoundary>
    </StrictMode>,
  );
}

void bootstrap();
