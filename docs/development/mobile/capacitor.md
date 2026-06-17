# Capacitor — Native Mobile Integrations

> **What is still open?** Unchecked items in this file (push, APNs/FCM, dev `server.url`, coach step trends) are summarized under [docs/README.md — Mobile / native](./README.md#mobile--native).

Prioritized native plugin integrations for the Vara Performance iOS and Android apps (Capacitor 8).

## Current State

| Plugin | Usage |
|--------|-------|
| `@capacitor/core` | Platform detection helpers (`isNativeApp()`, `getCapacitorPlatform()`) |
| `@capacitor/app` | `appStateChange` → TanStack Query `focusManager` |
| `@capacitor/splash-screen` | Branded splash (logo on `#0B1020`), delayed auto-hide — native images from `@capacitor/assets` (see below) |
| `@capacitor/status-bar` | iOS overlay + dark style |
| `@capacitor/preferences` | Native token storage (web falls back to `localStorage`) |
| `@capacitor/geolocation` | Native permissions with browser fallback |
| `@capacitor/camera` | `lib/camera.ts` — `pickImage()` with `CameraSource.Prompt` for native, `<input type="file">` fallback on web |
| `@capacitor/browser` | `lib/browser.ts` — `openUrl()` / `closeBrowser()` with web fallback |
| `@capacitor/haptics` | `lib/haptics.ts` — `hapticsLight()`, `hapticsMedium()`, `hapticsHeavy()`, `hapticsNotification()` (no-op on web) |
| `@capacitor/clipboard` | `lib/clipboard.ts` — `writeClipboard()` replacing all `navigator.clipboard` calls |
| `@capacitor/share` | `lib/share.ts` — `shareContent()` / `canShare()` with `navigator.share` fallback; supports `imageUrl` for native image sharing via `@capacitor/filesystem` |
| `@capacitor/filesystem` | Temp file writing for native image sharing via Share plugin |
| `@capacitor/keyboard` | `lib/keyboard.ts` — `onKeyboardShow()`, `onKeyboardHide()`, `hideKeyboard()`; resize config in `capacitor.config.ts` |
| `@capacitor/network` | `lib/network.ts` — `initNetworkListener()`, `onNetworkChange()`, `isOnline()`; offline banner + TanStack `onlineManager` |
| `@capacitor/local-notifications` | `lib/local-notifications.ts` — stack / water / habit / calendar reminders (no server push) |
| `@capacitor-mlkit/barcode-scanning` | Food diary barcode scanner with browser camera fallback |
| `@capawesome/capacitor-badge` | App icon badge from unread hooks |
| `@capgo/capacitor-social-login` | Google & Apple SSO (native flows) |
| `@capgo/capacitor-health` | Apple HealthKit + Health Connect read/write (`lib/health-data.ts`) |

Existing mobile UX patterns: `PullToRefresh` component (native-only, with haptic on threshold), platform-branched token hydration, `isNativeApp()` guards throughout, deep link listener via `appUrlOpen`, screen wake lock during active workouts.

### Splash screen and app icons

Native launch screens and launcher icons are generated with **`@capacitor/assets`** from the same logo as the web app (`src/assets/images/logo.png`), on the splash background color configured in `capacitor.config.ts` (`#0B1020`).

After `cap add ios` / `cap add android` (or whenever you change the logo), from the repo root:

```bash
pnpm --filter @varaperformance/web cap:assets
```

That copies the logo into `apps/web/assets/`, writes iOS `Splash.imageset` / `AppIcon.appiconset` and Android `drawable*` / `mipmap*` assets, then run `pnpm --filter @varaperformance/web cap:sync` (or `build:cap`) as usual. The monorepo allows `sharp` to run install scripts so image generation works on fresh installs.

---

## High Priority

### 1. Push Notifications

- [ ] Integrate `@capacitor/push-notifications` (FCM for Android, APNs for iOS)
- [ ] Register device tokens on backend — **new** authenticated endpoint (e.g. `POST /v1/notifications/devices`); not present today — notifications today use WebSocket + preferences only
- [ ] Map existing 15+ notification preference categories to push topics/channels
- [ ] Respect existing quiet hours and per-category toggles
- [ ] Handle notification tap → deep link to relevant screen
- [ ] Badge count sync via unread notification/message counts

**Why:** The notification infrastructure (Socket.IO events, preference categories, quiet hours) is fully built. Users miss all notifications when the app is backgrounded.

### 2. Deep Linking / Universal Links

- [x] Register `appUrlOpen` listener in `main.tsx` via `@capacitor/app`
- [x] Configure Associated Domains (iOS) and App Links (Android)
- [x] Route deep links: `/verify-email`, `/reset-password`, `/blog/:slug`, `/profile/:name`, `/shop/product/:slug`
- [x] Handle Strava OAuth callback (`/integrations/strava/callback`) natively
- [x] Generate shareable deep links for social posts, workout plans, recipes, coaching profiles

**Why:** Email verification, password resets, and shared content links all open in the browser instead of the app. Critical for user retention.

### 3. Haptic Feedback

- [x] Install `@capacitor/haptics`
- [x] Workout session: vibrate on set completion, timer events, PR celebration
- [x] Social: haptic on high-five toggle, post reactions, story transitions
- [x] Achievements: impact feedback on badge unlock
- [x] Messaging: medium impact on long-press context menu (already has `longPressTimerRef`)
- [x] PullToRefresh: light impact when crossing refresh threshold
- [x] Commerce: selection feedback on add-to-cart

**Why:** Dozens of interaction points throughout the app would feel significantly more native with tactile feedback.

### 4. Native Share Sheet

- [x] Replace `navigator.share()` with `@capacitor/share` in blog post view
- [x] Add share actions to social feed posts, recipes, workout plans, achievements, coaching profiles
- [x] Include deep link URLs in shared content for app-to-app sharing
- [x] Share text + URL for blog and social, image + URL for climb selfies and recipes

**Why:** Content-heavy app with blog, social feed, recipes, and workout plans — all shareable content today lacks native share integration.

### 5. Camera for Photo Uploads

- [x] Use `Camera.getPhoto()` from `@capacitor/camera` for all native photo flows
- [x] Profile: avatar and cover photo uploads
- [x] Social: Climb daily selfie, Elevate feed post images, story media
- [x] Health: recipe photos, workout progress photos
- [x] Coaching: coach certification document uploads
- [x] Source selection: camera vs gallery via `CameraSource` enum
- [x] Fallback to `<input type="file">` on web

**Why:** Six or more photo upload flows currently use HTML file inputs — the native camera picker is faster, more intuitive, and supports camera capture directly.

---

## Medium Priority

### 6. Clipboard

- [x] Replace 7+ `navigator.clipboard.writeText()` calls with `@capacitor/clipboard`
- [x] Coaching: copy invite links, contract IDs, booking details
- [x] Blog: copy post URLs, code blocks
- [x] Social: copy registration links, TOTP recovery codes
- [x] Display toast confirmation on copy

**Why:** `navigator.clipboard` can fail silently in some native WebViews. The Capacitor plugin provides reliable native clipboard access.

### 7. Keyboard Control

- [x] Install `@capacitor/keyboard`
- [x] Messaging: resize view on keyboard show/hide, scroll to latest message
- [x] Food diary search: auto-dismiss keyboard on scroll
- [x] Coaching chat: keyboard accessory bar visibility control
- [x] Global: prevent viewport push on input focus (iOS safe area)

**Why:** Chat and search-heavy screens need keyboard-aware layout handling for a native-quality experience.

### 8. Network Status

- [x] Install `@capacitor/network`
- [x] Show offline banner when connectivity is lost
- [x] Queue outgoing mutations (food logs, water intake, workout sets) for retry on reconnect
- [x] Replace browser `online`/`offline` events with native network listener for `refetchOnReconnect`

**Why:** Reliable connectivity detection is essential for a fitness app used at the gym — where signal is often poor.

### 9. Local Notifications

- [x] Install `@capacitor/local-notifications`
- [x] Health: supplement stack reminders per slot time, injection check-in reminders
- [x] Health: water intake goal nudges, habit check-in reminders
- [x] Calendar: coaching session start reminders (15 min, 1 hr before)
- [x] Works offline — no server push dependency

**Why:** Supplement stacks, injection protocols, and habit reminders are time-sensitive. Local notifications fire reliably without connectivity.

### 10. Biometric Auth & Secure Storage

- [x] Install `capacitor-biometric-auth` for Face ID / Touch ID / fingerprint
- [x] Prompt biometric re-auth on app resume (optional user setting)
- [x] Replace `@capacitor/preferences` token storage with encrypted secure storage plugin
- [x] Gate sensitive actions (payment, account deletion, export) behind biometric confirmation

**Why:** Native apps handle PHI-adjacent data; tokens should use **encrypted** secure storage (per checklist above), with biometric lock for sensitive flows—not long-lived plaintext in Preferences alone.

---

## Lower Priority

### 11. In-App Browser

- [x] Use `@capacitor/browser` via `lib/browser.ts` — `openUrl()` / `closeBrowser()`
- [x] Wire into Strava OAuth flow, Stripe Connect onboarding
- [x] Open external blog links in SFSafariViewController / Chrome Custom Tab

### 12. App Icon Badge

- [x] Install `@capawesome/capacitor-badge`
- [x] Sync badge count from `useUnreadCount` + `useTotalUnread` hooks
- [x] Clear badge on app open or when all notifications are read

### 13. Screen Orientation Lock

- [x] Install `@capacitor/screen-orientation`
- [x] Lock portrait during active workout session
- [x] Allow landscape for charts, dashboards, and recipe detail view

### 14. Keep Awake

- [x] `useKeepAwake(active)` hook using Screen Wake Lock API (`hooks/use-keep-awake.ts`)
- [x] Prevent screen sleep during active workout sessions (`ActiveSessionPanel`)
- [x] Release wake lock on session end or component unmount

### 15. HealthKit & Health Connect

- [x] Install `@capgo/capacitor-health` (unified plugin — wraps Apple HealthKit + Health Connect)
- [x] ~~Install `@nicehash/capacitor-healthkit` (iOS) and Health Connect plugin (Android)~~ — covered by `@capgo/capacitor-health`
- [x] Bidirectional sync: weight logs (`readWeightSamples`), workout sessions (`readWorkouts` + `writeWorkoutSession`), water intake (`readWaterSamples`), calories (estimated on workout export)
- [x] Auto-populate Lifestyle module (sleep hours, daily steps) from health data — backend models + sync endpoint + auto-sync on app launch/resume
- [x] Leverage existing `WorkoutSessionSource` enum and importer infrastructure
- [x] Consent flow matching existing AI consent pattern (HEALTH_DATA_CONSENT + Studio toggle + integrations page dialog)
- [x] Imported workout detail view: activity summary tiles, route map (Strava polyline decode), HR zone distribution chart, source badges
- [x] **Workout imports:** HealthKitId-based dedup — `@@unique([userId, healthKitId])` on `WorkoutSession` (separate from `HeartRateLog`, which has no HealthKit id per row)
- [x] Workout API surfaces full `externalSummary` (distance, pace, calories, elevation, polyline, HR data) via `formatSessionResponse()`

**Heart rate DB dedup (Postgres):** `HeartRateLog` now has `@@unique([userId, timestamp, source])` so `createMany({ skipDuplicates: true })` actually skips overlapping health syncs. Migration `20260423120000_heart_rate_logs_dedupe_unique` deletes existing duplicates (keeps earliest `createdAt` per key), drops the old non-unique index, and creates the unique index. Deploy with your usual `prisma migrate deploy` against production. If you **do not** run migrations from CI, run that migration’s SQL once via `kubectl exec … psql` (after a backup), same file order as in the migration.

### 16. Native Calendar Sync

- [x] Install `capacitor-calendar`
- [x] Export coaching sessions and calendar events to device calendar
- [x] Support `.ics` generation for one-tap calendar add

### 17. Action Sheets

- [x] Install `@capacitor/action-sheet`
- [x] Social: native action sheets for post reporting, edit, delete
- [x] Messaging: message context actions (already has long-press detection)
- [x] Profile: photo source picker (camera / gallery / remove)

### 18. App Store Review Prompt

- [x] Install `capacitor-rate-app`
- [x] Prompt review after milestone: first achievement, 30-day streak, 100th workout
- [x] Limit frequency — at most once per 90 days
- [x] Use native `SKStoreReviewController` (iOS) / In-App Review API (Android)

### 19. Daily Step Tracking

- [x] Read daily step count from HealthKit (iOS) / Health Connect (Android) via `@capgo/capacitor-health` (`readTodaySteps()`, `readSteps()`)
- [x] Auto-sync on app open and resume via `syncHealthToBackend()` in `main.tsx` (syncs last 7 days of steps, sleep, and heart rate)
- [x] Backend: `POST /health-data/steps` endpoint to log daily step count (date + count + source) — upserts on `userId + date + source`
- [x] Backend: Prisma model `StepLog` (userId, date, steps, source, createdAt) in `health-data.prisma`
- [x] Backend: `GET /health-data/steps?from=&to=` for trend data
- [x] Backend: `GET /health-data/steps/today` — returns `{ steps, goal, percent }` using `LifestyleGoal.dailySteps`
- [x] Backend: `DELETE /health-data/steps/:id`
- [x] Backend: `POST /health-data/sync` — bulk sync endpoint (steps + sleep + HR from mobile)
- [x] Frontend: TanStack Query hooks (`useStepsToday`, `useStepsTrend`, `useLogSteps`, `useDeleteStepLog`)
- [x] Dashboard: `goal-steps` card showing today's progress ring vs `dailySteps` goal (`GoalStepsCard` using `GoalWidget`)
- [x] Dashboard: weekly step trend bar chart (`StepTrendCard` — 7-day bars, green/amber/red color coding, goal reference line)
- [x] Include actual step counts in `LifestyleTrendPoint` (`stepCount`, `sleepHours`) and weekly report (`avgDailySteps`, `stepGoalDaysHit`)
- [x] Lifestyle adherence scoring updated: steps = 20pts, sleep hours factored into recovery score (20pts)
- [x] Web fallback: dedicated `/steps` page with manual entry (progress ring, quick-add buttons, 7-day trend, goal settings)
- [ ] Coach visibility: client step trends in coach client detail panel

### 20. Background Health Sync

- [x] Install `@capacitor/background-runner` for Android background task scheduling
- [x] Configure 15-minute interval background runner in `capacitor.config.ts` (`BackgroundRunner` plugin)
- [x] Background runner script (`public/background-runner.js`) pings sync-status endpoint to keep sessions warm
- [x] iOS: `UIBackgroundModes: fetch, processing` in `Info.plist` for Background App Refresh
- [x] Foreground sync on app open + resume via `appStateChange` listener in `main.tsx`
- [x] `syncHealthToBackend()` extended to sync weight, water, and workouts alongside steps/sleep/HR
- [x] Sync returns result data for UI feedback (toast in Studio sync settings)
- [x] Sync settings card in Studio: "Sync Now" button with loading state + last sync timestamps per source

**Depends on:** #15 (HealthKit & Health Connect), #19 (Daily Step Tracking).

---

## Configuration Checklist

### iOS (`ios/App/`)

- [x] Associated Domains entitlement for universal links
- [ ] Push notification capability + APNs key
- [x] `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`
- [x] `NSLocationWhenInUseUsageDescription` (already needed for geolocation)
- [x] `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription` (for HealthKit)
- [x] `NSFaceIDUsageDescription` (for biometric auth)
- [ ] App Groups for badge count + push extension (if using notification service extension)

### Android (`android/app/`)

- [ ] `google-services.json` for FCM
- [x] `assetlinks.json` hosted at `/.well-known/` for App Links
- [x] Camera and storage permissions in `AndroidManifest.xml`
- [x] Health Connect permissions declaration
- [ ] Notification channels matching preference categories
- [x] `resizeOnKeyboard` input mode in `AndroidManifest.xml`

### Capacitor Config (`capacitor.config.ts`)

- [x] Add `PushNotifications` plugin config (presentationOptions for iOS)
- [x] Add `Keyboard` plugin config (resize mode, scroll behavior)
- [x] Add `LocalNotifications` plugin config (icon, channel defaults)
- [ ] Configure `server.url` for development with live reload

---

## Known Issues

_None currently tracked._

### Resolved

- **~~Closing the native camera launches the web/browser camera fallback.~~** Root cause: `pickImage()` returned `null` on both web (not native) and native cancel. All call sites fell through to `fileInputRef.current?.click()` after a native cancel. Fixed by returning `{ file, native }` from `pickImage()` — callers now only trigger the web file input when `native` is `false`.
