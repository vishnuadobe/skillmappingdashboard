import adobeImsConfig from './adobe-ims-config.js';
import {
  isAuthenticated,
  handleRedirectCallback,
  getUserProfile,
  clearSession,
  login,
  logout as imsLogout,
} from './adobe-ims-client.js';
import { setUser, clearUser } from './db.js';

export function isProtectedPage() {
  return adobeImsConfig.protectedPaths.some(
    (path) => window.location.pathname === path
      || window.location.pathname.startsWith(`${path}/`),
  );
}

export async function initializeAuth() {
  const url = new URL(window.location.href);

  if (url.searchParams.has('code')) {
    try {
      const { originalUri } = await handleRedirectCallback();
      window.history.replaceState({}, '', originalUri);
    } catch {
      return false;
    }
  }

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    await login(window.location.href);
    return false;
  }

  try {
    const profile = await getUserProfile();
    await setUser({
      name: profile.name || '',
      email: profile.email || '',
      ldap: profile.account_id || '',
      isManager: false,
    });
  } catch { /* continue even if profile fetch fails */ }

  return true;
}

export default async function logout() {
  await clearUser();
  clearSession();
  await imsLogout();
}
