import { InteractionRequiredAuthError, PublicClientApplication, type AccountInfo } from '@azure/msal-browser';
import { config } from '../config';

let instance: PublicClientApplication | null = null;

export function msal(): PublicClientApplication | null {
  return instance;
}

export async function initAuth(): Promise<void> {
  const { auth } = config();
  if (auth.mode !== 'entra') return;
  instance = new PublicClientApplication({
    auth: {
      clientId: auth.clientId,
      authority: auth.authority,
      knownAuthorities: [new URL(auth.authority).host],
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
    },
    // sessionStorage keeps tokens out of persistent storage on shared admin machines.
    cache: { cacheLocation: 'sessionStorage' },
  });
  await instance.initialize();
  const result = await instance.handleRedirectPromise();
  const account = result?.account ?? instance.getAllAccounts()[0];
  if (account) instance.setActiveAccount(account);
}

export function activeAccount(): AccountInfo | null {
  return instance?.getActiveAccount() ?? null;
}

export function hasRequiredRole(account: AccountInfo | null): boolean {
  const role = config().auth.requiredRole;
  if (!role) return account !== null;
  const roles = (account?.idTokenClaims?.roles as string[] | undefined) ?? [];
  return roles.includes(role);
}

export function login(): Promise<void> {
  return instance!.loginRedirect({ scopes: config().auth.apiScopes });
}

export function logout(): Promise<void> {
  return instance!.logoutRedirect({ account: activeAccount() ?? undefined });
}

/** Bearer token for Olga.Core, or null when auth is disabled. Redirects if interaction is required. */
export async function getAccessToken(): Promise<string | null> {
  const { auth } = config();
  if (auth.mode !== 'entra' || !instance || auth.apiScopes.length === 0) return null;
  const account = activeAccount();
  if (!account) { await login(); return null; }
  try {
    const result = await instance.acquireTokenSilent({ scopes: auth.apiScopes, account });
    return result.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await instance.acquireTokenRedirect({ scopes: auth.apiScopes, account });
      return null;
    }
    throw e;
  }
}
