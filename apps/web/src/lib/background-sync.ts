/**
 * Background sync configuration.
 *
 * Health data syncing is handled via:
 *
 * 1. **Foreground sync** (main.tsx):
 *    - On app open: `syncHealthToBackend()` runs immediately
 *    - On app resume: `appStateChange` listener triggers sync
 *
 * 2. **iOS Background Fetch** (Info.plist):
 *    - `UIBackgroundModes: fetch` allows iOS to periodically wake the app
 *    - When woken, `appStateChange` fires and triggers `syncHealthToBackend()`
 *
 * 3. **Android Background Runner** (capacitor.config.ts):
 *    - `@capacitor/background-runner` runs `background-runner.js` every ~15 min
 *    - The runner pings the backend sync-status endpoint to keep sessions warm
 *
 * 4. **Workout Export** (use-workout-sessions.ts):
 *    - `useEndSession` writes completed sessions to HealthKit/Health Connect
 *
 * No explicit registration is needed — configuration is declarative.
 */
export {};
