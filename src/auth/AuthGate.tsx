import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { config } from '../config';
import { basicLogout, currentBasicSession, type BasicSession } from './basic';
import { LoginPage } from './LoginPage';
import { activeAccount, hasRequiredRole, login, logout } from './msal';

export interface AuthUser { name: string; username: string }
interface AuthState { user: AuthUser | null; logout: () => void }

const AuthContext = createContext<AuthState>({ user: null, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

export function AuthGate({ children }: { children: ReactNode }) {
  const mode = config().auth.mode;
  if (mode === 'basic') return <BasicGate>{children}</BasicGate>;
  if (mode === 'entra') return <EntraGate>{children}</EntraGate>;
  return <AuthContext.Provider value={{ user: null, logout: () => {} }}>{children}</AuthContext.Provider>;
}

function BasicGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<BasicSession | null>(currentBasicSession);
  // Full reload on sign-out drops all cached data from memory.
  const signOut = useCallback(() => { basicLogout(); setSession(null); window.location.assign('/'); }, []);

  // End the session when it expires while the tab is open.
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(signOut, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(t);
  }, [session, signOut]);

  if (!session) return <LoginPage mode="basic" onBasicLogin={setSession} />;
  return (
    <AuthContext.Provider value={{ user: { name: session.username, username: session.username }, logout: signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function EntraGate({ children }: { children: ReactNode }) {
  const account = activeAccount();
  if (!account) return <LoginPage mode="entra" onEntraLogin={() => void login()} />;

  if (!hasRequiredRole(account)) {
    return (
      <div className="center-screen">
        <div className="card auth-card">
          <h1>Access denied</h1>
          <p className="muted">
            <strong>{account.username}</strong> is signed in but doesn't have the <code>{config().auth.requiredRole}</code> role.
            Ask an administrator to grant it.
          </p>
          <button className="btn btn-block" onClick={() => void logout()}>Sign out</button>
        </div>
      </div>
    );
  }

  const user = { name: account.name ?? account.username, username: account.username };
  return <AuthContext.Provider value={{ user, logout: () => void logout() }}>{children}</AuthContext.Provider>;
}
