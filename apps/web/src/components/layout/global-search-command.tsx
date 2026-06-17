import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';
import { ArrowUpRight, Clock, Search } from 'lucide-react';
import {
  GLOBAL_SEARCH_NAV_ITEMS,
  type NavSearchItem,
} from '@/components/layout/global-search-nav-items';

const RECENTS_STORAGE_KEY = 'vara_nav_search_recents_v1';
const MAX_RECENTS = 8;

type RecentNav = { path: string; title: string; at: number };

type SelectableRow = {
  id: string;
  title: string;
  path: string;
  group: string;
  isRecent: boolean;
};

function loadRecents(): RecentNav[] {
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentNav =>
          r &&
          typeof r === 'object' &&
          typeof (r as RecentNav).path === 'string' &&
          typeof (r as RecentNav).title === 'string',
      )
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function pushRecent(path: string, title: string) {
  try {
    const prev = loadRecents().filter((r) => r.path !== path);
    const next: RecentNav[] = [{ path, title, at: Date.now() }, ...prev].slice(
      0,
      MAX_RECENTS,
    );
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / privacy mode */
  }
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || target.isContentEditable) return true;
  if (tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const input = target as HTMLInputElement;
    const skip = ['button', 'checkbox', 'radio', 'submit', 'reset', 'file'];
    if (skip.includes(input.type)) return false;
    if (input.readOnly) return false;
    return true;
  }
  return false;
}

function itemAllowed(
  item: NavSearchItem,
  hasPermission: (p: string) => boolean,
  hasAllPermissions: (p: string[]) => boolean,
): boolean {
  if (!item.permission) return true;
  if (Array.isArray(item.permission)) {
    return hasAllPermissions(item.permission);
  }
  return hasPermission(item.permission);
}

function matchesNavItem(item: NavSearchItem, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  const blob = [
    item.title,
    item.path.replace(/\//g, ' '),
    ...(item.keywords ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return blob.includes(n);
}

function matchesRecent(r: RecentNav, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  return r.title.toLowerCase().includes(n) || r.path.toLowerCase().includes(n);
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<RecentNav[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { hasPermission, hasAllPermissions } = useAuth();

  useLayoutEffect(() => {
    openRef.current = open;
  }, [open]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (next) {
      setRecents(loadRecents());
      setHighlighted(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
    }
  }, []);

  const visibleNav = useMemo(
    () =>
      GLOBAL_SEARCH_NAV_ITEMS.filter(
        (item) =>
          itemAllowed(item, hasPermission, hasAllPermissions) &&
          matchesNavItem(item, query),
      ),
    [hasPermission, hasAllPermissions, query],
  );

  const rows: SelectableRow[] = useMemo(() => {
    const out: SelectableRow[] = [];
    const q = query.trim();
    const recentMatches = recents.filter((r) => matchesRecent(r, q));
    for (const r of recentMatches) {
      out.push({
        id: `recent:${r.path}`,
        title: r.title,
        path: r.path,
        group: 'Recent',
        isRecent: true,
      });
    }
    const seen = new Set(out.map((o) => o.path));
    for (const item of visibleNav) {
      if (seen.has(item.path)) continue;
      seen.add(item.path);
      out.push({
        id: item.id,
        title: item.title,
        path: item.path,
        group: item.group,
        isRecent: false,
      });
    }
    return out;
  }, [recents, query, visibleNav]);

  const activeIndex =
    rows.length === 0 ? 0 : Math.min(Math.max(0, highlighted), rows.length - 1);

  const go = useCallback(
    (path: string, title: string) => {
      pushRecent(path, title);
      navigate(path);
      handleOpenChange(false);
    },
    [navigate, handleOpenChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key !== 'k') return;
      if (openRef.current) {
        e.preventDefault();
        handleOpenChange(false);
        return;
      }
      if (isTextInputTarget(e.target)) return;
      e.preventDefault();
      handleOpenChange(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleOpenChange]);

  const onKeyDownDialog = (e: React.KeyboardEvent) => {
    if (rows.length === 0) return;
    const len = rows.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => {
        const c = Math.min(Math.max(0, h), len - 1);
        return Math.min(c + 1, len - 1);
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => {
        const c = Math.min(Math.max(0, h), len - 1);
        return Math.max(c - 1, 0);
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = rows[activeIndex];
      if (row) go(row.path, row.title);
    }
  };

  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="relative w-full max-w-36 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <button
            type="button"
            onClick={() => handleOpenChange(true)}
            className={cn(
              'flex h-9 w-full items-center rounded-md border border-border/50 bg-muted/30 pl-9 pr-4 text-left text-sm text-muted-foreground outline-none',
              'hover:bg-muted/50 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20',
            )}
          >
            <span className="truncate">Search…</span>
            <kbd className="pointer-events-none ml-auto hidden shrink-0 rounded border bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-lg"
          data-global-search-dialog
          onKeyDown={onKeyDownDialog}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Jump to a page in the app. Type to filter. Use arrow keys and
              Enter.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b border-border/60 px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Go to…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlighted(0);
                }}
                className="h-10 w-full rounded-md border border-border/50 bg-background pl-9 pr-3 text-sm outline-none focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div
            className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain p-2"
            role="listbox"
            aria-label="Navigation results"
          >
            {rows.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No matches. Try another word or check spelling.
              </p>
            ) : (
              rows.map((row, index) => (
                <button
                  key={row.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => go(row.path, row.title)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors',
                    index === activeIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted/60',
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/80 text-muted-foreground">
                    {row.isRecent ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {row.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.path}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {row.group}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">
              ↑↓ navigate · Enter open ·{' '}
            </span>
            Esc close · ⌘K toggle
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
