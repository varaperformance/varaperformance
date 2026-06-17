import { useCallback, useEffect, useState } from 'react';

export const HEALTH_NAV_GROUPS_STORAGE_KEY = 'vara-health-nav-groups-open';

/** Default: keep daily paths visible; tuck longer lists (nutrition, tools) behind one tap. */
export const defaultHealthNavGroupOpen: Record<string, boolean> = {
  overview: true,
  nutrition: false,
  vitals: true,
  training: true,
  tools: false,
};

function readStored(): Record<string, boolean> {
  if (typeof window === 'undefined') {
    return { ...defaultHealthNavGroupOpen };
  }
  try {
    const raw = localStorage.getItem(HEALTH_NAV_GROUPS_STORAGE_KEY);
    if (!raw) return { ...defaultHealthNavGroupOpen };
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return { ...defaultHealthNavGroupOpen, ...parsed };
  } catch {
    return { ...defaultHealthNavGroupOpen };
  }
}

/**
 * Persists which health nav sub-groups are expanded (desktop sidebar + mobile More sheet).
 */
export function useHealthNavGroupOpen() {
  const [openById, setOpenById] = useState<Record<string, boolean>>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(
        HEALTH_NAV_GROUPS_STORAGE_KEY,
        JSON.stringify(openById),
      );
    } catch {
      // ignore quota / private mode
    }
  }, [openById]);

  const setGroupOpen = useCallback((id: string, open: boolean) => {
    setOpenById((prev) => ({ ...prev, [id]: open }));
  }, []);

  return { openById, setGroupOpen };
}
