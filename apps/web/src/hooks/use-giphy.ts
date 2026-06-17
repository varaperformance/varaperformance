import { useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  GiphySearchResponse,
  GiphyGif,
} from '@varaperformance/core';

// ============================================
// API Functions
// ============================================

export const giphyKeys = {
  all: ['giphy'] as const,
  search: (query: string, limit: number, rating: string) =>
    [...giphyKeys.all, 'search', query, limit, rating] as const,
  trending: (limit: number, rating: string) =>
    [...giphyKeys.all, 'trending', limit, rating] as const,
};

type GiphyResult = SuccessResponse<GiphySearchResponse>;

const searchGifs = async (
  query: string,
  limit: number,
  offset: number,
  rating: 'g' | 'pg' | 'pg-13' | 'r',
): Promise<GiphyResult> => {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(offset),
    rating,
  });
  const response = await api.get<GiphyResult>(
    `messaging/giphy/search?${params}`,
  );
  if (!response.data.success) {
    throw new Error('Failed to search GIFs');
  }
  return response.data;
};

const getTrendingGifs = async (
  limit: number,
  offset: number,
  rating: 'g' | 'pg' | 'pg-13' | 'r',
): Promise<GiphyResult> => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    rating,
  });
  const response = await api.get<GiphyResult>(
    `messaging/giphy/trending?${params}`,
  );
  if (!response.data.success) {
    throw new Error('Failed to load trending GIFs');
  }
  return response.data;
};

// ============================================
// Hook
// ============================================

export interface UseGiphyOptions {
  rating?: 'g' | 'pg' | 'pg-13' | 'r';
  limit?: number;
}

export function useGiphy(options: UseGiphyOptions = {}) {
  const { rating = 'pg', limit = 25 } = options;
  const [searchQuery, setSearchQuery] = useState('');

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useInfiniteQuery({
    queryKey: giphyKeys.search(searchQuery, limit, rating),
    queryFn: ({ pageParam }) =>
      searchGifs(searchQuery, limit, pageParam, rating),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const { offset, count, totalCount } = lastPage.data.pagination;
      const next = offset + count;
      return next < totalCount ? next : undefined;
    },
    enabled: isSearching,
    staleTime: 1000 * 60 * 5,
  });

  const trendingResults = useInfiniteQuery({
    queryKey: giphyKeys.trending(limit, rating),
    queryFn: ({ pageParam }) => getTrendingGifs(limit, pageParam, rating),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const { offset, count, totalCount } = lastPage.data.pagination;
      const next = offset + count;
      return next < totalCount ? next : undefined;
    },
    enabled: !isSearching,
    staleTime: 1000 * 60 * 5,
  });

  const activeQuery = isSearching ? searchResults : trendingResults;

  const search = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const loadMore = useCallback(() => {
    if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
      activeQuery.fetchNextPage();
    }
  }, [activeQuery]);

  const gifs: GiphyGif[] =
    activeQuery.data?.pages.flatMap((page) => page.data.gifs) ?? [];

  return {
    gifs,
    isLoading: activeQuery.isLoading,
    isFetchingMore: activeQuery.isFetchingNextPage,
    isError: activeQuery.isError,
    error: activeQuery.error,
    hasMore: activeQuery.hasNextPage ?? false,
    searchQuery,
    isSearching,
    search,
    clearSearch,
    loadMore,
  };
}

export type { GiphyGif };
