import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SearchBoxCore,
  SessionToken,
  type SearchBoxSuggestion,
  type SearchBoxFeatureSuggestion,
} from '@mapbox/search-js-core';
import { getCurrentLocation } from '@/lib/location';

// Re-export types for convenience
export type { SearchBoxSuggestion, SearchBoxFeatureSuggestion };

// Initialize Mapbox SearchBox
let searchBox: SearchBoxCore | null = null;

function getSearchBox(): SearchBoxCore | null {
  if (searchBox) return searchBox;

  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('Mapbox access token not set. Gym search will not work.');
    return null;
  }

  searchBox = new SearchBoxCore({ accessToken });
  return searchBox;
}

export interface MapboxPlace {
  id: string;
  name: string;
  formattedAddress: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  categories: string[];
}

/**
 * Convert Mapbox suggestion to our MapboxPlace format
 */
function suggestionToMapboxPlace(
  suggestion: SearchBoxSuggestion,
  feature?: SearchBoxFeatureSuggestion,
): MapboxPlace {
  const categories = suggestion.poi_category || [];

  // Get coordinates from retrieved feature if available
  let latitude = 0;
  let longitude = 0;
  if (feature?.geometry?.type === 'Point') {
    [longitude, latitude] = feature.geometry.coordinates;
  }

  return {
    id: suggestion.mapbox_id,
    name: suggestion.name,
    formattedAddress:
      suggestion.full_address || suggestion.place_formatted || '',
    city: suggestion.context?.place?.name || '',
    state: suggestion.context?.region?.name,
    country: suggestion.context?.country?.name || '',
    postalCode: suggestion.context?.postcode?.name,
    latitude,
    longitude,
    categories,
  };
}

interface UseMapboxSearchOptions {
  /** Max results to return (max 10) */
  limit?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Proximity bias - results closer to this location will be ranked higher */
  proximity?: { lng: number; lat: number } | null;
  /** Automatically get user's location for proximity bias */
  useProximity?: boolean;
}

/**
 * Hook for searching places using Mapbox SearchBox API
 */
export function useMapboxSearch(options: UseMapboxSearchOptions = {}) {
  const {
    limit = 10,
    debounceMs = 300,
    proximity: externalProximity,
    useProximity = false,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MapboxPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lng: number;
    lat: number;
  } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<SessionToken>(new SessionToken());

  // Get user's location for proximity bias
  useEffect(() => {
    if (!useProximity) return;

    getCurrentLocation({
      enableHighAccuracy: false,
      timeoutMs: 5000,
      maximumAgeMs: 300000,
    })
      .then((location) => {
        setUserLocation({
          lng: location.lng,
          lat: location.lat,
        });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('Geolocation error:', message);
        // Silently fail - proximity is optional
      });
  }, [useProximity]);

  // Use external proximity if provided, otherwise use detected location
  const proximity = externalProximity ?? userLocation;

  const search = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      const search = getSearchBox();
      if (!search) {
        setError('Mapbox not initialized. Check your API key.');
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        // Build search options - limit must be <= 10 per Mapbox API
        const searchOptions: Parameters<typeof search.suggest>[1] = {
          sessionToken: sessionTokenRef.current,
          limit: Math.min(limit, 10), // Mapbox max is 10
        };

        // Add proximity bias if available
        if (proximity) {
          searchOptions.proximity = proximity;
        }

        const response = await search.suggest(searchQuery, searchOptions);

        // Convert suggestions to our format
        const places = response.suggestions.map((s) =>
          suggestionToMapboxPlace(s),
        );

        setResults(places.slice(0, limit));
      } catch (err) {
        console.error('Mapbox search error:', err);
        // Handle different error types from Mapbox
        let errorMessage = 'Search failed';
        if (err instanceof Error) {
          // MapboxError stores original error in message which may be an object
          const msg = err.message;
          if (
            msg &&
            typeof msg === 'string' &&
            !msg.includes('[object Object]')
          ) {
            errorMessage = msg;
          } else {
            // Try to extract from error properties
            const errAny = err as unknown as {
              originalError?: { message?: string };
              error?: string | { message?: string };
              statusCode?: number;
            };
            if (errAny.originalError?.message) {
              errorMessage = errAny.originalError.message;
            } else if (typeof errAny.error === 'string') {
              errorMessage = errAny.error;
            } else if (errAny.error?.message) {
              errorMessage = errAny.error.message;
            } else {
              errorMessage = 'Search request failed. Please try again.';
            }
          }
        }
        setError(errorMessage);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [limit, proximity],
  );

  // Retrieve full details for a suggestion (to get coordinates)
  const retrieveDetails = useCallback(
    async (place: MapboxPlace): Promise<MapboxPlace | null> => {
      const search = getSearchBox();
      if (!search) return null;

      try {
        // Create a minimal suggestion object for retrieval
        const suggestion = { mapbox_id: place.id } as SearchBoxSuggestion;
        const response = await search.retrieve(suggestion, {
          sessionToken: sessionTokenRef.current,
        });

        if (response.features.length > 0) {
          const feature = response.features[0];
          // Update place with coordinates
          if (feature.geometry?.type === 'Point') {
            const [lng, lat] = feature.geometry.coordinates;
            return {
              ...place,
              latitude: lat,
              longitude: lng,
            };
          }
        }
        return place;
      } catch (err) {
        console.error('Mapbox retrieve error:', err);
        return place;
      }
    },
    [],
  );

  // Debounced search when query changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      search(query);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search, debounceMs]);

  // Reset session token on unmount or after successful retrieval
  useEffect(() => {
    return () => {
      sessionTokenRef.current = new SessionToken();
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
    search,
    retrieveDetails,
  };
}
