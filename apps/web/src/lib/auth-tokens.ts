import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { isNativeApp } from '@/lib/capacitor';

const ACCESS_TOKEN_KEY = 'vara.auth.accessToken';
const REFRESH_TOKEN_KEY = 'vara.auth.refreshToken';
const MIGRATED_KEY = 'vara.auth.secureStorageMigrated';
// Plain Preferences key readable by CapacitorKV inside the BackgroundRunner.
// SecureStorage is unavailable in the background context; Preferences is the
// shared store between the runner and the main app.
const BG_ACCESS_TOKEN_KEY = 'vara.auth.bgAccessToken';

const nativeTokenCache = {
  accessToken: null as string | null,
  refreshToken: null as string | null,
  hydrated: false,
};

interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

function canUseStorage(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  );
}

async function migrateToSecureStorage(): Promise<void> {
  if (!isNativeApp()) return;
  const { value: migrated } = await Preferences.get({ key: MIGRATED_KEY });
  if (migrated === 'true') return;

  // Read tokens from old Preferences store
  const [oldAccess, oldRefresh] = await Promise.all([
    Preferences.get({ key: ACCESS_TOKEN_KEY }),
    Preferences.get({ key: REFRESH_TOKEN_KEY }),
  ]);

  // Copy to encrypted SecureStorage
  if (oldAccess.value) {
    await SecureStorage.set(ACCESS_TOKEN_KEY, oldAccess.value);
  }
  if (oldRefresh.value) {
    await SecureStorage.set(REFRESH_TOKEN_KEY, oldRefresh.value);
  }

  // Remove from plain Preferences
  await Promise.all([
    Preferences.remove({ key: ACCESS_TOKEN_KEY }),
    Preferences.remove({ key: REFRESH_TOKEN_KEY }),
  ]);

  await Preferences.set({ key: MIGRATED_KEY, value: 'true' });
}

async function syncNativeTokenCache(): Promise<void> {
  if (!isNativeApp() || nativeTokenCache.hydrated) {
    return;
  }

  await migrateToSecureStorage();

  const [accessToken, refreshToken] = await Promise.all([
    SecureStorage.get(ACCESS_TOKEN_KEY) as Promise<string | null>,
    SecureStorage.get(REFRESH_TOKEN_KEY) as Promise<string | null>,
  ]);

  nativeTokenCache.accessToken = accessToken;
  nativeTokenCache.refreshToken = refreshToken;
  nativeTokenCache.hydrated = true;
}

export async function hydrateAuthTokens(): Promise<void> {
  await syncNativeTokenCache();
}

export function getAccessToken(): string | null {
  if (isNativeApp()) {
    return nativeTokenCache.accessToken;
  }
  if (!canUseStorage()) {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (isNativeApp()) {
    return nativeTokenCache.refreshToken;
  }
  if (!canUseStorage()) {
    return null;
  }
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(tokens: AuthTokenPair): void {
  if (isNativeApp()) {
    nativeTokenCache.accessToken = tokens.accessToken;
    nativeTokenCache.refreshToken = tokens.refreshToken;
    nativeTokenCache.hydrated = true;

    void Promise.all([
      SecureStorage.set(ACCESS_TOKEN_KEY, tokens.accessToken),
      SecureStorage.set(REFRESH_TOKEN_KEY, tokens.refreshToken),
      // Mirror access token to plain Preferences so the BackgroundRunner
      // (CapacitorKV) can fetch notifications without SecureStorage access.
      Preferences.set({ key: BG_ACCESS_TOKEN_KEY, value: tokens.accessToken }),
    ]);

    return;
  }

  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthTokens(): void {
  if (isNativeApp()) {
    nativeTokenCache.accessToken = null;
    nativeTokenCache.refreshToken = null;
    nativeTokenCache.hydrated = true;

    void Promise.all([
      SecureStorage.remove(ACCESS_TOKEN_KEY),
      SecureStorage.remove(REFRESH_TOKEN_KEY),
      Preferences.remove({ key: BG_ACCESS_TOKEN_KEY }),
    ]);

    return;
  }

  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
