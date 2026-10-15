import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setConfigForTests } from '../config';
import { LoginPage } from './LoginPage';

// sha256("admin@olga")
const HASH = 'f94526ff153dcbb00662c406a2c090f468916397919bf4455b4c6037240a0dd7';

async function signIn(user: string, pass: string) {
  await userEvent.clear(screen.getByLabelText('Username'));
  await userEvent.type(screen.getByLabelText('Username'), user);
  await userEvent.type(screen.getByLabelText('Password'), pass);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginPage (basic)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setConfigForTests({ auth: { mode: 'basic', username: 'olgaadmin', passwordSha256: HASH, sessionMinutes: 60 } as never });
  });

  it('signs in with the correct credentials', async () => {
    const onLogin = vi.fn();
    render(<LoginPage mode="basic" onBasicLogin={onLogin} />);
    await signIn('olgaadmin', 'admin@olga');
    expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ username: 'olgaadmin' }));
  });

  it('rejects a wrong password', async () => {
    const onLogin = vi.fn();
    render(<LoginPage mode="basic" onBasicLogin={onLogin} />);
    await signIn('olgaadmin', 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password');
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('locks out after 5 failed attempts', async () => {
    render(<LoginPage mode="basic" onBasicLogin={vi.fn()} />);
    for (let i = 0; i < 5; i++) await signIn('olgaadmin', 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many failed attempts');
  });
});
