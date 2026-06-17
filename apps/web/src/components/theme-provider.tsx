import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ThemeProviderContext, type Theme } from './theme-context';
import { useProfile } from '@/features/profile';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vara-performance-theme',
  ...props
}: ThemeProviderProps) {
  const { data: profileData } = useProfile();
  const profile = profileData?.success ? profileData.data : null;
  const syncedUserIdRef = useRef<string | null>(null);

  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  useEffect(() => {
    if (!profile?.userId) return;
    if (syncedUserIdRef.current === profile.userId) return;

    syncedUserIdRef.current = profile.userId;
    if (
      profile.theme === 'light' ||
      profile.theme === 'dark' ||
      profile.theme === 'system'
    ) {
      const profileTheme: Theme = profile.theme;
      localStorage.setItem(storageKey, profileTheme);
      const timeoutId = window.setTimeout(() => {
        setTheme(profileTheme);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [profile?.userId, profile?.theme, storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleSetTheme = useCallback(
    (t: Theme) => {
      localStorage.setItem(storageKey, t);
      setTheme(t);
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ theme, setTheme: handleSetTheme }),
    [theme, handleSetTheme],
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
