import { Geolocation } from '@capacitor/geolocation';
import { isNativeApp } from '@/lib/capacitor';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GetCurrentLocationOptions {
  timeoutMs?: number;
  maximumAgeMs?: number;
  enableHighAccuracy?: boolean;
}

// ─── Module-level cache ─────────────────────────────────────────────────────
// Prevents multiple permission prompts when several hooks/pages call
// getCurrentLocation() concurrently or in quick succession.
let cachedLocation: Coordinates | null = null;
let cachedAt = 0;
let pendingRequest: Promise<Coordinates> | null = null;

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getCurrentLocation(
  options: GetCurrentLocationOptions = {},
): Promise<Coordinates> {
  const maxAge = options.maximumAgeMs ?? DEFAULT_CACHE_TTL_MS;

  // Return cached result if still fresh
  if (cachedLocation && Date.now() - cachedAt < maxAge) {
    return cachedLocation;
  }

  // Coalesce concurrent requests into a single permission/GPS call
  if (pendingRequest) return pendingRequest;

  pendingRequest = fetchLocation(options)
    .then((coords) => {
      cachedLocation = coords;
      cachedAt = Date.now();
      return coords;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

async function fetchLocation(
  options: GetCurrentLocationOptions,
): Promise<Coordinates> {
  if (isNativeApp()) {
    try {
      const permissionStatus = await Geolocation.checkPermissions();
      if (permissionStatus.location !== 'granted') {
        await Geolocation.requestPermissions();
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy ?? false,
        timeout: options.timeoutMs ?? 5000,
        maximumAge: options.maximumAgeMs ?? DEFAULT_CACHE_TTL_MS,
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch (error) {
      console.warn(
        'Native geolocation failed, falling back to browser:',
        error,
      );
    }
  }

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not available in this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(error.message || 'Unable to get current location'));
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? false,
        timeout: options.timeoutMs ?? 5000,
        maximumAge: options.maximumAgeMs ?? DEFAULT_CACHE_TTL_MS,
      },
    );
  });
}
