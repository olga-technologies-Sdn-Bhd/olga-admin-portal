import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthGate';
import { config } from '../config';
import { ErrorBoundary } from './feedback';
import { Icon, type IconName } from './icons';
import { ThemeToggle } from './ThemeToggle';

const sections: { label: string; items: { to: string; label: string; icon: IconName; end?: boolean }[] }[] = [
  { label: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: 'dashboard', end: true }] },
  {
    label: 'Manage', items: [
      { to: '/events', label: 'Events', icon: 'calendar' },
      { to: '/venues', label: 'Venues', icon: 'pin' },
      { to: '/members', label: 'Members', icon: 'users' },
    ],
  },
  {
    label: 'Trust & safety', items: [
      { to: '/moderation', label: 'Moderation', icon: 'shield' },
      { to: '/privacy', label: 'Privacy requests', icon: 'lock' },
    ],
  },
  { label: 'System', items: [{ to: '/settings', label: 'Settings', icon: 'settings' }] },
];

const envLabel = { local: 'Local', dev: 'Dev', staging: 'Staging', production: 'Prod' } as const;

export function Layout() {
  const { environment, useMocks } = config();
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">O</span> OL-GA Admin
          <span className={`env env-${environment}`}>{envLabel[environment]}</span>
        </div>
        <nav aria-label="Main">
          {sections.map((s) => (
            <div key={s.label} style={{ display: 'contents' }}>
              <div className="nav-label">{s.label}</div>
              {s.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                  <Icon name={n.icon} /> {n.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          {useMocks && <div className="mock-flag">Mock data</div>}
          <div className="user">
            <span className="avatar" aria-hidden>{(user?.name ?? 'A').slice(0, 1).toUpperCase()}</span>
            <span className="user-name" title={user?.username}>{user?.name ?? 'Admin'}<span className="sub">Administrator</span></span>
            <ThemeToggle />
            {user && <button className="icon-btn" onClick={logout} aria-label="Sign out" title="Sign out"><Icon name="logout" /></button>}
          </div>
        </div>
      </aside>
      <main className="content" id="main">
        <ErrorBoundary>
          <Suspense fallback={<p className="muted pad">Loading…</p>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
