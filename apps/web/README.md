# Vara Performance — Web

React frontend for Vara Performance, a fitness platform for workout tracking,
nutrition, coaching, and community.

## Tech Stack

- **Framework** — [React](https://react.dev/) 19
- **Language** — TypeScript 5.9
- **Build Tool** — [Vite](https://vite.dev/) 7
- **Styling** — [Tailwind CSS](https://tailwindcss.com/) 4 + [Radix UI](https://www.radix-ui.com/)
- **Routing** — [React Router](https://reactrouter.com/) 7
- **Data Fetching** — [TanStack Query](https://tanstack.com/query) + [Axios](https://axios-http.com/)
- **Charts** — [Recharts](https://recharts.org/)

## Features

- Landing pages (home, features, pricing, about, team, press)
- Authentication (login, register, OAuth)
- Dashboard with workout analytics
- Blog with Markdown editor
- Exercise library
- Coach booking
- Status page
- Admin panel
- Social feed
- Shop
- Dark/light theme

## Project Structure

```text
apps/web/src/
├── admin/          # Admin panel
├── assets/         # Static assets
├── components/
│   ├── common/     # Shared components
│   ├── layout/     # Layout wrappers
│   └── ui/         # Radix-based UI primitives
├── hooks/          # Custom React hooks
├── lib/            # Utilities (API client, helpers)
├── pages/          # Route pages
└── routes/         # Route definitions
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9

## Setup

All commands are run from the **monorepo root**.

```bash
# Install dependencies
pnpm install

# Build the core package (required dependency)
pnpm --filter @varaperformance/core build
```

## Documentation

- Web features: [../../docs/web/FEATURES.md](../../docs/web/FEATURES.md)
- Web security notes: [../../docs/web/SECURITY.md](../../docs/web/SECURITY.md)

## Development

```bash
# Start dev server
pnpm dev:web

# Build for production
pnpm --filter web build

# Preview production build
pnpm --filter web preview

# Lint
pnpm --filter web lint
```

## Mobile — iOS (Capacitor)

The web app is wrapped into a native iOS app using [Capacitor](https://capacitorjs.com/) 8. Capacitor copies the Vite production build into the native Xcode project and bridges JavaScript calls to native APIs.

### Additional Prerequisites

- **macOS** with Xcode 15+ installed
- **CocoaPods** — manages native iOS pod dependencies (`sudo gem install cocoapods`)
- **Xcode Command Line Tools** — `xcode-select --install`

### iOS Native Plugins

CocoaPods resolves all Capacitor plugin dependencies from `node_modules` via the `Podfile` at `ios/App/Podfile`. The minimum iOS deployment target is **16.0**. Plugins in use:

| Plugin | Purpose |
| ------ | ------- |
| `@capacitor/splash-screen` | Launch screen shown on app open |
| `@capacitor/status-bar` | Status bar style control |
| `@capacitor/keyboard` | Keyboard resize behaviour |
| `@capacitor/camera` | Photo capture and library access |
| `@capacitor/geolocation` | GPS location for map features |
| `@capacitor/local-notifications` | Scheduled on-device notifications |
| `@capacitor/background-runner` | Background health sync (15 min interval) |
| `@capacitor/haptics` | Taptic engine feedback |
| `@capacitor/preferences` | Persistent key-value storage |
| `@capacitor/filesystem` | File read/write access |
| `@capacitor/share` | Native share sheet |
| `@capacitor/network` | Network connectivity detection |
| `@capacitor/browser` | In-app browser for OAuth flows |
| `@capacitor/clipboard` | Clipboard read/write |
| `@capacitor/app` | App lifecycle and deep link handling |
| `@capacitor/screen-orientation` | Lock/unlock screen rotation |
| `@capacitor-mlkit/barcode-scanning` | Camera-based barcode / QR scanning |
| `@capacitor-community/in-app-review` | App Store review prompt |
| `@capgo/capacitor-health` | HealthKit integration |
| `@capgo/capacitor-social-login` | Google / Apple Sign-In |
| `@aparajita/capacitor-biometric-auth` | Face ID / Touch ID |
| `@aparajita/capacitor-secure-storage` | Keychain-backed secure storage |
| `@capawesome/capacitor-badge` | App icon badge count |
| `capacitor-calendar` | Calendar event creation |

### iOS Commands

All commands run from **`apps/web/`** unless noted.

```bash
# 1. Build the web app
pnpm --filter @varaperformance/web build

# 2. Copy the build into the native project and update plugin config
npx cap sync ios

# 3. Install / update CocoaPods (required after pnpm install or cap sync)
cd ios/App && pod install && cd ../..

# 4. Open in Xcode to run on simulator or device
npx cap open ios
```

> **Note:** Run `pod install` (not `pod update`) after every `pnpm install` or `cap sync` to keep pod lockfile versions stable. The `Podfile` resolves all pods directly from `node_modules` — no separate CocoaPods registry lookups are needed for Capacitor plugins.

### App Configuration

Key settings in [`capacitor.config.ts`](capacitor.config.ts):

| Setting | Value |
| ------- | ----- |
| App ID | `com.varaperformance.app` |
| iOS content inset | `always` |
| Web hostname (scheme) | `varaperformance.com` over `https` |
| Background runner event | `healthSync` every 15 minutes |

---

## License

MIT — see [LICENSE.md](../../LICENSE.md).
