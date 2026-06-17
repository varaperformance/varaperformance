import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X, TrendingUp, Loader2 } from 'lucide-react';
import { useGiphy, type GiphyGif } from '@/hooks/use-giphy';
import { useDebounce } from '@/hooks/use-debounce';

interface GifPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (gif: GiphyGif) => void;
}

export function GifPicker({ open, onOpenChange, onSelect }: GifPickerProps) {
  const [inputValue, setInputValue] = useState('');
  const debouncedSearch = useDebounce(inputValue, 300);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    gifs,
    isLoading,
    isFetchingMore,
    isError,
    hasMore,
    isSearching,
    search,
    clearSearch,
    loadMore,
  } = useGiphy({ limit: 20 });

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch) {
      search(debouncedSearch);
    } else {
      clearSearch();
    }
  }, [debouncedSearch, search, clearSearch]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      // Use requestAnimationFrame to avoid cascading renders
      requestAnimationFrame(() => {
        setInputValue('');
      });
      clearSearch();
    }
  }, [open, clearSearch]);

  // Reset scroll position when search query changes
  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0);
  }, [debouncedSearch]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoading || isFetchingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      loadMore();
    }
  }, [isLoading, isFetchingMore, hasMore, loadMore]);

  const handleSelect = (gif: GiphyGif) => {
    onSelect(gif);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <img
              src="https://giphy.com/static/img/giphy_logo_square_social.png"
              alt="GIPHY"
              className="h-6 w-6"
              loading="lazy"
              decoding="async"
            />
            Search GIFs
          </DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search GIFs..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
            />
            {inputValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setInputValue('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Category label */}
        <div className="px-4 pb-2 flex items-center gap-2 text-sm text-muted-foreground">
          {isSearching ? (
            <>
              <Search className="h-4 w-4" />
              <span>Results for "{debouncedSearch}"</span>
            </>
          ) : (
            <>
              <TrendingUp className="h-4 w-4" />
              <span>Trending</span>
            </>
          )}
        </div>

        {/* GIF grid */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 pb-4"
        >
          {isLoading && gifs.length === 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-muted-foreground">
              Something went wrong loading GIFs. Please try again.
            </div>
          ) : gifs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isSearching
                ? 'No GIFs found. Try a different search.'
                : 'No trending GIFs available.'}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleSelect(gif)}
                    className="relative group rounded-lg overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{
                      aspectRatio:
                        gif.previewWidth && gif.previewHeight
                          ? `${gif.previewWidth} / ${gif.previewHeight}`
                          : '16 / 9',
                    }}
                  >
                    <img
                      src={gif.previewUrl}
                      alt={gif.title || 'GIF'}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Loading more indicator */}
              {isFetchingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Giphy attribution */}
        <div className="px-4 py-2 border-t flex justify-center">
          <a
            href="https://giphy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <img
              src="https://giphy.com/static/img/giphy_logo_square_social.png"
              alt="Powered by GIPHY"
              className="h-5"
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
