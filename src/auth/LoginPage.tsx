import { useState, type FormEvent } from 'react';
import { config } from '../config';
import { Icon } from '../components/icons';
import { ThemeToggle } from '../components/ThemeToggle';
import { basicLogin, type BasicSession } from './basic';

type Props =
  | { mode: 'basic'; onBasicLogin: (s: BasicSession) => void }
  | { mode: 'entra'; onEntraLogin: () => void };

export function LoginPage(props: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (props.mode !== 'basic') return;
    setBusy(true);
    setError(null);
    const result = await basicLogin(username, password);
    setBusy(false);
    if (result.ok) { props.onBasicLogin(result.session); return; }
    setPassword('');
    setError(result.reason === 'locked'
      ? `Too many failed attempts. Try again in ${Math.ceil((result.retryInMs ?? 0) / 1000)} seconds.`
      : 'Incorrect username or password.');
  };

  return (
    <div className="login-screen">
      <aside className="login-hero">
        <div className="brand"><span className="logo">O</span> OL-GA Admin</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2>Run every event from one place.</h2>
          <p>Create and publish events, manage venues and members, and keep the community safe.</p>
        </div>
        <div className="login-points">
          <div><Icon name="calendar" /> Events and venues</div>
          <div><Icon name="users" /> Member management</div>
          <div><Icon name="shield" /> Moderation and privacy</div>
        </div>
      </aside>
      <div className="login-side">
      <div className="login-theme"><ThemeToggle /></div>
      <div className="login-panel">
        <div className="login-brand">
          <h1>Welcome back</h1>
          <p className="muted">Sign in to the OL-GA admin panel</p>
        </div>

        {props.mode === 'entra' ? (
          <button className="btn btn-primary btn-block" onClick={props.onEntraLogin}>Sign in with Microsoft</button>
        ) : (
          <form className="login-form" onSubmit={submit} noValidate>
            <label htmlFor="username">Username</label>
            <input id="username" autoComplete="username" autoFocus required value={username}
              onChange={(e) => setUsername(e.target.value)} disabled={busy} />

            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
              <button type="button" className="link-btn" onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy || !username || !password}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        <p className="login-foot muted">{config().environment.toUpperCase()} environment</p>
      </div>
      </div>
    </div>
  );
}
