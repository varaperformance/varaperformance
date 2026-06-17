# Mobile Native Experience Plan

> **Reference** — UX and native shell behavior. **Open** native work (push, APNs/FCM, etc.) is listed in [docs/README.md](./README.md#mobile--native) and [CAPACITOR.md](./CAPACITOR.md).

Make the Capacitor-wrapped app look and feel like a native iOS/Android app — not a web page in a phone-shaped frame.

---

## Current State

### What's already good

| Area | Status |
|------|--------|
| Native APIs | Comprehensive — camera, share, haptics, biometrics, action sheets, keyboard, network, health sync, notifications, badge, orientation lock |
| Pull-to-refresh | Custom touch handler, native-only, haptic at threshold, invalidates all queries |
| Input sizing | `text-base md:text-sm` prevents iOS auto-zoom |
| Platform detection | `isNativeApp()` and `getCapacitorPlatform()` used in 20+ files |
| Offline awareness | Network listener + offline banner + TanStack `onlineManager` |
| Safe area | Partial — Sheet sides, body left/right/bottom padding |

### What feels like a web wrapper

| # | Problem | Impact |
|---|---------|--------|
| 1 | **No bottom tab bar** — hamburger menu is the only navigation | Every screen change = 3 taps through a 40-item list |
| 2 | **No bottom sheets** — detail views use centered Dialogs or right-side Sheets | Feels like a desktop modal, not a native card |
| 3 | **No page transitions** — instant React Router swaps with no animation | Feels like clicking links on a website |
| 4 | **No swipe gestures** — no swipe-back, swipe-to-dismiss, swipe-to-delete | Missing the entire iOS/Android gesture vocabulary |
| 5 | **Hover-dependent UI** — food diary delete/favorite buttons are `opacity-0 group-hover:opacity-100` | **Invisible and untappable on touch devices** |
| 6 | **Dialog + keyboard collision** — `h-[80vh]` centered dialogs get crushed when keyboard opens | Search dialogs become unusable |
| 7 | **Toast position `bottom-right`** — desktop pattern, clips behind any future bottom nav | Should be top-center on mobile |
| 8 | **Header wastes space** — search bar always visible, desktop density | Mobile should show contextual title + compact actions |
| 9 | **Desktop-first layouts** — two-column grids, wide tables, dense card headers | Content competes for 375px of space |
| 10 | **No scroll indicators** — horizontal tab bars (`overflow-x-auto`) with no hint of more content | Users don't discover off-screen tabs |

---

## Plan

### Phase 1: Bottom Tab Bar + Navigation Overhaul

The single highest-impact change. Every native app has a persistent bottom tab bar for core screens.

**M1.1 — Create `<MobileTabBar>` component**

5 tabs, icon + label, fixed to bottom with safe-area padding:

```
┌─────────────────────────────────────────┐
│  🏠        🏋️        🍽️       💬       ⋯  │
│ Home    Workouts   Food    Messages   More│
└─────────────────────────────────────────┘
```

- Render only when `isNativeApp()` or below `md` breakpoint
- Active tab: filled icon + primary color label
- Inactive: outline icon + muted label
- Badge dot on Messages (unread count), Notifications (via More)
- `pb-[env(safe-area-inset-bottom)]` for iPhone home indicator
- Haptic selection feedback on tab tap
- Tab bar hides on scroll-down, reveals on scroll-up (optional — defer if complex)

**M1.2 — Create `<MobileMoreSheet>` for overflow navigation**

The "More" tab opens a bottom sheet grid with the remaining nav items:

```
┌─────────────────────────────────────────┐
│              ─── (drag handle)          │
│                                         │
│  📊 Dashboard    🎯 Goals    📅 Calendar │
│  📈 Weight       💧 Water    🏃 Steps    │
│  😴 Sleep        ❤️ Heart    📐 Body     │
│  🏆 Achievements 🔥 Challenges          │
│  🧪 Stacks      💉 Injections           │
│  📋 Plans       🏅 Records              │
│  🥗 Recipes     🛒 Grocery              │
│  ⚙️ Settings    🔗 Integrations         │
│                                         │
└─────────────────────────────────────────┘
```

- Bottom sheet (not left-side Sheet) using existing `Sheet side="bottom"`
- Grid layout: 3 columns, icon + label per cell
- Recently-visited items pinned to top row
- Coaching section only visible for coach role
- Calculators grouped under a single "Calculators" entry → sub-sheet

**M1.3 — Simplify mobile header**

Replace the desktop header on mobile with a native-style nav bar:

```
┌─────────────────────────────────────────┐
│  ← Back         Page Title        🔔 👤 │
└─────────────────────────────────────────┘
```

- Back button: shows when `history.length > 1` or on non-root routes
- Page title: contextual, derived from route metadata or `<title>` context
- Right: notification bell + avatar (compact, no search bar)
- Search moves to a dedicated search screen or expandable overlay on tap
- Height: 44pt (iOS standard) + safe-area-inset-top

**M1.4 — Update `<AppLayout>` for mobile**

- Desktop (`md+`): unchanged — sidebar + header + content
- Mobile (`< md` or native): tab bar + mobile header + content (no sidebar Sheet)
- Remove hamburger menu on mobile
- Adjust main content area: remove `md:ml-64` on mobile, add bottom padding for tab bar
- `<PullToRefresh>` wraps content between header and tab bar

---

### Phase 2: Bottom Sheets + Native Dialogs

Replace desktop-style centered dialogs with bottom sheets for mobile. This is the pattern users expect from every iOS/Android app.

**M2.1 — Install react-modal-sheet (bottom drawer library)**

[react-modal-sheet](https://github.com/Temzasse/react-modal-sheet) is a Motion-based bottom sheet with built-in iOS scroll locking, keyboard avoidance, drag-to-dismiss, and snap points. Replaced Vaul which had scroll-passthrough issues on iOS WKWebView.

- Install `react-modal-sheet` + `motion` in `apps/web`
- Create `<ResponsiveDialog>` wrapper component:
  - Desktop: renders standard shadcn `<Dialog>` (centered modal)
  - Mobile: renders `<NativeDrawer>` (react-modal-sheet bottom sheet with drag handle)
  - Same children API — pages don't change, just wrap in `<ResponsiveDialog>`

**M2.2 — Convert food diary `AddFoodDialog` to bottom sheet**

The most-used dialog in the app. Currently a centered `max-w-md h-[80vh]` box.

Mobile version:
- Full-height bottom sheet with snap points: 90% (default), 50% (collapsed)
- Search input sticky at top (above scroll area)
- Tab bar (`Search | Scan | Faves | Recent | Create`) below search, horizontally scrollable with fade indicator
- Results list fills remaining space with native momentum scroll
- When food selected → sheet expands to show amount stepper + Log button
- Keyboard opens → sheet content adjusts naturally (react-modal-sheet handles this)

**M2.3 — Convert workout detail to bottom sheet**

Currently `Sheet side="right"` (desktop sidebar panel). On mobile:
- Bottom sheet, snap to 60% (preview) and 95% (full detail)
- Drag handle + swipe-to-dismiss
- Activity summary tiles, route map, HR zones render in scrollable content

**M2.4 — Convert confirmation dialogs**

All `<AlertDialog>` instances — delete confirmations, destructive actions:
- Mobile: bottom-anchored action sheet style (not centered floating box)
- Destructive button in red, cancel at bottom
- Matches native iOS alert/action sheet pattern

**M2.5 — Convert form dialogs (create/edit)**

Goal settings, custom food creation, habit creation, etc.:
- Mobile: bottom sheet, full-width inputs, large tap targets
- Submit button sticky at bottom with safe-area padding
- Dismiss via swipe-down or X button

---

### Phase 3: Touch Interactions + Gestures

**M3.1 — Fix hover-dependent buttons**

Critical fix — buttons hidden behind `group-hover:opacity-100` are invisible on mobile.

- Food diary: `FoodLogEntry` delete button, `FoodSearchItem` favorite star
- Any other `group-hover:opacity-100` patterns across the codebase
- Fix: always show on mobile (`opacity-100` when `< md` or touch device), keep hover-reveal on desktop
- Use `@media (hover: hover)` to detect hover capability:

```css
/* Always visible on touch devices */
.group-hover\:opacity-100 {
  @media (hover: none) {
    opacity: 1;
  }
}
```

**M3.2 — Swipe-to-delete on list items**

For food log entries, notifications, messages:
- Horizontal swipe reveals red delete action
- Spring animation on release
- Haptic feedback on threshold crossing
- Use a lightweight swipe library or custom touch handler (no heavy gesture library needed)

**M3.3 — Swipe-back navigation**

iOS users expect to swipe from left edge to go back:
- Detect left-edge touch start (within 20px of screen edge)
- Animate page slide-right to reveal previous page
- On release past threshold → `router.back()`
- Only on `isNativeApp()` — don't interfere with browser swipe-back on web

**M3.4 — Swipeable tabs**

For food diary tabs (Search/Scan/Faves/Recent/Create), workout detail tabs:
- Horizontal swipe between tab panels
- Tab indicator animates to follow swipe position
- Snap to nearest tab on release
- Deferred — implement after core navigation and sheets land

---

### Phase 4: Page Transitions

Animate route changes so navigation feels like pushing/popping screens, not clicking links.

**M4.1 — Slide transitions for push/pop navigation**

- Forward navigation (tap link/button): new page slides in from right
- Back navigation (back button/swipe-back): current page slides out to right, previous slides in from left
- Use `startViewTransition` (View Transitions API) on supported browsers, CSS fallback otherwise
- Duration: 250ms ease-out (matches iOS UINavigationController)
- Only on mobile / `isNativeApp()` — desktop keeps instant swaps

**M4.2 — Bottom sheet entry for modals**

- Sheets/drawers slide up from bottom with spring animation (react-modal-sheet handles this)
- Backdrop fades in simultaneously
- Dismiss: swipe down or tap backdrop

**M4.3 — Shared element transitions (deferred)**

- Profile avatar → profile page
- Food item → food detail
- Requires View Transitions API level 2 — defer until browser support is broader

---

### Phase 5: Mobile-Optimized Layouts

> **Scope: all pages — public AND authenticated.** Every page from the Home Page onward should feel native on mobile. The `MasterLayout` (public), `ShopLayout`, `CalculatorsLayout`, and `AppLayout` (authenticated) all need mobile treatment.

#### Public Pages (MasterLayout + ShopLayout)

**M5.P1 — Mobile-native public header**

The public `<Header>` currently renders desktop navigation links. On mobile:
- Hamburger → full-screen overlay nav or bottom sheet (not a tiny dropdown)
- Logo centered, CTA button ("Get Started" / "Sign In") right-aligned
- Height: 44pt + `env(safe-area-inset-top)` for Capacitor
- Sticky on scroll, blur background (`backdrop-blur-lg`)
- Auth links (Login/Register) prominent with filled primary button for CTA

**M5.P2 — Home page mobile layout**

- Hero: full-width, single-column, large CTA button (not side-by-side text + image)
- Feature cards: stacked vertically, full-width with consistent padding
- Social proof / testimonials: horizontal swipeable carousel (not multi-column grid)
- Pricing preview: stacked cards, most popular plan highlighted
- CTA sections: large touch targets, sticky bottom CTA bar on scroll
- Remove any desktop-first multi-column grids that don't collapse properly

**M5.P3 — Features / About / Team pages mobile layout**

- Single-column stacked sections
- Team grid: 2 columns on mobile (not 3-4), larger photos + names
- Feature sections: icon + text stacked vertically, not side-by-side
- Full-width images with proper aspect ratios

**M5.P4 — Blog / Release Notes mobile layout**

- Blog listing: single-column card list, full-width featured images
- Blog detail: reading-optimized — `max-w-prose`, larger body text (16px+), full-width images that break out of padding
- Release notes: timeline-style list, collapsible entries
- Share button: native share sheet on mobile via `navigator.share()` / Capacitor Share plugin

**M5.P5 — Pricing page mobile layout**

- Stacked plan cards (not side-by-side), most popular plan first or highlighted
- Feature comparison: horizontal scroll table with sticky first column, or accordion per plan
- CTA buttons: full-width, sticky bottom bar with selected plan
- Toggle (monthly/annual) centered and prominent

**M5.P6 — Contact / FAQ / Legal pages mobile layout**

- Contact form: full-width inputs, large tap targets, sticky submit button
- FAQ: accordion-style, full-width, good spacing between items
- Legal pages (Terms, Privacy, HIPAA, etc.): reading-optimized prose, table of contents as sticky top bar or collapsible

**M5.P7 — Coach profiles + Booking pages mobile layout**

- Coach listing: stacked cards with photo, name, specialties, CTA
- Coach detail: hero image + sticky "Book" button at bottom
- Booking flow: step-by-step single-column, date picker mobile-native, confirmation full-screen

**M5.P8 — Shop mobile layout (ShopLayout)**

- Product grid: 2-column on mobile, full-width on small screens
- Product detail: hero image (swipeable gallery), sticky "Add to Cart" bar at bottom
- Cart: bottom sheet or full-screen overlay (not sidebar panel)
- Checkout: single-column form, large inputs, step progress bar at top
- Confirmation: centered success state with clear CTA

**M5.P9 — Auth pages mobile layout (Login/Register/Forgot Password)**

- Centered card → full-width on mobile, no card border (edge-to-edge)
- Large inputs, social login buttons full-width
- Password visibility toggle easy to tap
- Keyboard-aware: form scrolls into view when keyboard opens
- "Sign In with Apple" button follows Apple HIG sizing on mobile

**M5.P10 — Calculators mobile layout (hybrid MasterLayout/AppLayout)**

- Calculator list: grid of cards, 2 columns on mobile
- Individual calculator: single-column form, large number inputs with `inputMode="decimal"`
- Result display: sticky at bottom or prominent card above fold
- Clear button accessible, not hidden

**M5.P11 — Public Elevate profiles mobile layout**

- Profile header: full-width hero with avatar overlay
- Stats / activity: horizontal scrollable cards or stacked
- Posts feed: single-column, full-width media

**M5.P12 — Spotlight / Ambassadors / Careers / Press pages mobile layout**

- Card-based listings: single-column stacked
- Application forms: full-width, multi-step where appropriate
- Press resources: downloadable assets with large tap targets

**M5.P13 — Public footer mobile layout**

- Collapsible link sections (accordion-style) instead of multi-column grid
- Social icons row, centered
- App store badges prominent
- Legal links in compact row at bottom
- Respect `env(safe-area-inset-bottom)` on Capacitor

#### Authenticated Pages (AppLayout)

**M5.1 — Food diary mobile layout**

The most-used screen. Current layout stacks a large summary card above 4 meal cards.

Mobile redesign:
- **Summary bar** (compact): horizontal strip with calorie ring (40px) + 3 macro mini-bars, not a full card
- Move below the header, above meal sections — always visible without scrolling past a 200px card
- **Meal cards**: full-width, border-left accent, tighter padding
- **Quick-add buttons**: row of pill buttons below each meal header
- **Food entries**: swipe-to-delete instead of hover-to-reveal delete button
- **Add food**: FAB (floating action button) at bottom-right → opens bottom sheet (not centered dialog)

**M5.2 — Messaging mobile layout**

- Conversations list as primary view (full screen, not a sidebar panel)
- Tap conversation → push to chat screen (slide transition)
- Back button returns to list
- Input bar fixed to bottom with safe-area padding
- Keyboard-aware: input rises with keyboard, messages scroll to bottom

**M5.3 — Dashboard mobile layout**

- Single-column card stack (no multi-column grid)
- Cards: full-width with consistent padding
- Drag-to-reorder cards (long-press → haptic → drag)
- Collapsible card sections
- Pull-to-refresh reloads all dashboard data (already works)

**M5.4 — Settings / profile mobile layout**

- Grouped list style (iOS Settings pattern): rounded cards with list items, chevron for drill-down
- Section headers in small caps
- Toggle switches aligned right
- Destructive actions at bottom in red

---

### Phase 6: Micro-Interactions + Polish

**M6.1 — Toast positioning**

- Mobile: `position="top-center"` (above content, below status bar)
- Desktop: keep `position="bottom-right"`
- Branch in Sonner `<Toaster>` config based on viewport or `isNativeApp()`

**M6.2 — Scroll indicators for horizontal tabs**

- Fade gradient on the trailing edge when more tabs exist off-screen
- CSS `mask-image: linear-gradient(to right, black 85%, transparent)` when scrollable
- Apply to: food diary tabs, workout detail tabs, stories bar, any `overflow-x-auto` tab list

**M6.3 — Loading skeletons**

- Replace spinner-only loading states with content-shaped skeleton placeholders
- Food diary: skeleton meal cards with shimmer
- Messaging: skeleton conversation rows
- Dashboard: skeleton cards matching expected card shapes
- Use existing shadcn `<Skeleton>` with `animate-pulse`

**M6.4 — Haptic feedback expansion**

- Tab bar: selection haptic on tap
- Bottom sheet: light haptic when snap point reached
- Swipe-to-delete: medium haptic at delete threshold
- Pull-to-refresh: already has haptic (keep)
- Form submit success: notification haptic
- Error states: error notification haptic

**M6.5 — Safe area consistency**

Audit and fix all screens:
- Top: header respects `env(safe-area-inset-top)` on all pages
- Bottom: tab bar + any fixed-bottom elements respect `env(safe-area-inset-bottom)`
- Left/right: content padding includes `env(safe-area-inset-left/right)` for landscape
- Keyboard: `Keyboard.resize: "body"` already configured — verify all fixed-bottom elements adjust

**M6.6 — Native-feeling inputs**

- Number inputs: replace `type="number"` with `type="text" inputMode="decimal"` (avoids spinner arrows on iOS)
- Date inputs: use native date picker on mobile, keep custom picker on desktop
- Select dropdowns: let native `<select>` render on mobile (iOS wheel), use Radix Select on desktop
- Search: `inputMode="search"` for search-specific keyboard with "Search" return key

---

## Implementation Order

### Phase 1: Navigation — The Foundation ✅
- [x] M1.1 — Create `<MobileTabBar>` with 5 tabs (Home, Workouts, Food, Messages, More)
- [x] M1.2 — Create `<MobileMoreSheet>` bottom sheet grid for overflow nav items
- [x] M1.3 — Create `<MobileHeader>` with back button, contextual title, compact actions
- [x] M1.4 — Update `<AppLayout>` to branch mobile vs desktop layout

### Phase 2: Bottom Sheets — The Feel ✅
- [x] M2.1 — Install react-modal-sheet, create `<ResponsiveDialog>` + `<ResponsiveAlertDialog>` (Dialog on desktop, Drawer on mobile)
- [x] M2.2 — Convert `AddFoodDialog` to mobile bottom sheet (near full-screen 95vh, icon-only tabs, touch-friendly amount stepper)
- [x] M2.3 — Convert workout detail to mobile bottom sheet (`side="bottom"` on mobile, `side="right"` on desktop)
- [x] M2.4 — Convert **all** dialogs + alert dialogs to bottom sheets at the base level (`dialog.tsx` and `alert-dialog.tsx` re-export responsive versions — 60+ consumer files converted automatically)
- [x] M2.5 — Convert form dialogs to bottom sheets with sticky submit (handled by base-level conversion)
- [x] M2.6 — Mobile header user menu (avatar tap → bottom sheet with Refresh Permissions, Admin, Public Site, Sign Out)
- [x] M2.7 — `<NativeDrawer>` powered by react-modal-sheet — handles iOS scroll locking, keyboard avoidance, drag-to-dismiss. 2-tier rendering in responsive-dialog: Radix (desktop) / NativeDrawer (all mobile)
- [x] M2.8 — Keyboard-aware drawer positioning — NativeDrawer listens to `keyboardWillShow`/`keyboardWillHide` and shifts `bottom` offset to keep content above keyboard

### Phase 5: Layouts — The Screens (NOW NEXT)

> Moved ahead of Phases 3 & 4. Layout problems affect every page visit; gestures and transitions are polish on top of a good layout.

#### Public pages (MasterLayout / ShopLayout)
- [x] M5.P1 — Mobile-native public header (centered logo, sticky blur backdrop, safe-area top, CTA visible)
- [x] M5.P2 — Home page mobile layout (full-width hero, stacked features, sticky CTA)
- [x] M5.P3 — Features / About / Team pages (single-column, 2-col team grid)
- [x] M5.P4 — Blog / Release Notes (reading-optimized, native share)
- [x] M5.P5 — Pricing page (stacked plan cards, scroll comparison, sticky CTA)
- [x] M5.P6 — Contact / FAQ / Legal pages (accordion FAQ, reading-optimized legal)
- [x] M5.P7 — Coach profiles + Booking pages (hero + sticky Book, step-by-step booking)
- [x] M5.P8 — Shop mobile layout (2-col grid, swipeable gallery, sticky Add to Cart, bottom sheet cart)
- [x] M5.P9 — Auth pages (edge-to-edge form, large inputs, keyboard-aware)
- [x] M5.P10 — Calculators mobile layout (2-col list, large inputs, sticky result)
- [x] M5.P11 — Public Elevate profiles (full-width hero, stacked stats)
- [x] M5.P12 — Spotlight / Ambassadors / Careers / Press (stacked cards, multi-step forms)
- [x] M5.P13 — Public footer mobile (collapsible accordion sections, safe-area bottom)

#### Authenticated pages (AppLayout)
- [x] M5.1 — Food diary mobile-optimized layout (compact summary, full-width meals)
- [x] M5.2 — Messaging mobile layout (full-screen conversation list → push to chat)
- [x] M5.3 — Dashboard mobile layout (single-column card stack)
- [x] M5.4 — Settings / profile grouped list style
- [x] M5.5 — Workout log mobile layout (full-width session cards, compact exercise rows)
- [x] M5.6 — Workout plans mobile layout (stacked plan cards, drill-down to plan detail)
- [x] M5.7 — Weight / body measurements mobile layout (chart + compact entry list)
- [x] M5.8 — Water / steps / sleep / heart rate tracker layouts (daily ring + quick-log strip)
- [x] M5.9 — Goals / habits mobile layout (progress cards, swipe-to-complete)
- [x] M5.10 — Weekly report mobile layout (scrollable metric cards, single-column)
- [x] M5.11 — Recipes / recipe detail mobile layout (hero image + sticky action bar)
- [x] M5.12 — Meal plans / grocery lists mobile layout (checklist-style, swipe actions)
- [x] M5.13 — Stack management / injection tracker mobile layout (timeline view)
- [x] M5.14 — Personal records mobile layout (category tabs + record cards)
- [x] M5.15 — Exercises library mobile layout (search-first, compact exercise cards)
- [x] M5.16 — Elevate feed mobile layout (full-width posts, edge-to-edge media, stories bar)
- [x] M5.16b — Elevate Studio mobile layout (profile editing, partners grid, settings — tabbed bottom-sheet or full-screen sections)
- [x] M5.17 — Climb (leaderboard) mobile layout (rank list, sticky user position)
- [x] M5.18 — Achievements / challenges mobile layout (badge grid, progress rings)
- [x] M5.19 — Calendar mobile layout (compact month view, day-detail bottom sheet)
- [x] M5.20 — Calculators mobile layout (single-column form, large inputs, sticky result)
- [x] M5.21 — Coach pages mobile layout (client list, session cards, schedule view)
- [x] M5.22 — My coaching mobile layout (coach card, upcoming sessions, chat shortcut)
- [x] M5.23 — Shop / product / checkout mobile layout (product cards, sticky cart bar)
- [x] M5.24 — Notifications mobile layout (grouped list, swipe-to-dismiss)
- [x] M5.25 — Personal notes mobile layout (note list + editor, full-screen on tap)
- [x] M5.26 — Integrations mobile layout (connection cards, toggle switches)
- [x] M5.27 — Blog / release notes mobile layout (reading-optimized, full-width images)

### Phase 3: Touch — The Interactions
- [x] M3.1 — Fix hover-dependent buttons (`@media (hover: none)` override)
- [x] M3.2 — Swipe-to-delete on food entries, notifications, messages
- [x] M3.3 — Swipe-back navigation (left-edge gesture → `router.back()`)
- [x] M3.4 — Swipeable tab panels (food diary, workout detail)

### Phase 4: Transitions — The Motion
- [x] M4.1 — Slide transitions for push/pop navigation (View Transitions API)
- [x] M4.2 — Bottom sheet spring animations (handled by react-modal-sheet / Motion)
- [x] M4.3 — Shared element transitions (deferred)

### Phase 6: Polish — The Details (partial)
- [x] M6.1 — Toast positioning (top-center on mobile)
- [x] M6.2 — Scroll indicators for horizontal tab bars
- [x] M6.3 — Content-shaped loading skeletons
- [x] M6.4 — Haptic feedback on all interactive elements
- [x] M6.5 — Safe area audit and fixes
- [x] M6.6 — Native-feeling input types

---

## Known Issues

| # | Issue | Context | Applies to | Status |
|---|-------|---------|-----------|--------|
| 1 | ~~**Scroll passthrough in NativeDrawer**~~ | Add Food dialog → search results list | Any NativeDrawer | ✅ Fixed — replaced custom drawer + Vaul with `react-modal-sheet` which has battle-tested iOS scroll locking built in |
| 2 | ~~**No safe-area handling on public pages**~~ | `MasterLayout` header/footer, ShopLayout | All public routes | ✅ Fixed — header has `pt-[env(safe-area-inset-top)]`, footer has `pb-[env(safe-area-inset-bottom)]`, MasterLayout has L/R safe-area |
| 3 | ~~**Public nav is desktop-only**~~ | `MasterLayout` `<Header>` hamburger/nav | All public routes on mobile | ✅ Fixed — hamburger menu replaced with bottom tab bar (Home, Features, Pricing, Shop, More). Authenticated users see app tabs. Desktop nav unchanged |
| 4 | ~~**Desktop-first grids on public pages**~~ | Home, Features, Pricing, Team, Blog | All public marketing pages | ✅ Fixed — all public pages use `useIsMobile()` + `cn()` for single-column mobile grids |
| 5 | ~~**Hover-dependent UI on public pages**~~ | Shop product cards, coach cards, blog cards | Shop + public listing pages | ✅ Fixed — expanded `@media (hover: none)` rule to cover `group-hover:opacity-70` and breakpoint-prefixed variants |
| 6 | ~~**No keyboard-aware forms on auth/public pages**~~ | Login, Register, Contact, Booking, Checkout | Auth + public form pages | ✅ Fixed — `Input` component auto-sets `inputMode` from `type`, NativeDrawer handles keyboard |
| 7 | ~~**Footer multi-column grid not collapsible**~~ | `<Footer>` component | All pages with footer | ✅ Fixed — collapsible accordion sections on mobile, safe-area bottom padding |

---

## Guiding Principles

1. **Mobile-first, not mobile-also.** Every component should be designed for touch first, then enhanced for mouse/keyboard.
2. **Thumb zone.** Primary actions within reach of one-handed use. Navigation at the bottom, destructive actions require deliberate reach.
3. **Fewer taps.** Core flows (log food, log workout, check messages) should be reachable in 1 tap from the tab bar.
4. **Match platform expectations.** iOS users expect bottom sheets, swipe-back, and edge gestures. Android users expect material-style FABs and back button. Lean iOS-first since that's the primary Capacitor target.
5. **Progressive enhancement.** All changes are mobile-only or responsive. Desktop experience stays identical. Gate native features behind `isNativeApp()` or responsive breakpoints.
6. **No new dependencies unless necessary.** `react-modal-sheet` + `motion` replaced Vaul for reliable iOS scroll locking. Gestures use native touch events. Transitions use View Transitions API.
