# Feature roadmap

**What is still open?** See **[Outstanding work → Product](./README.md#outstanding-work)** in [`docs/README.md`](./README.md). The sections below summarize what has already shipped; they no longer use long checkbox lists (those went stale and duplicated git history).

---

## Not done yet (backlog)

### High value

- **Wearables (non-Apple)**: **Google Fit**, **Garmin Connect**, **Withings** (plans in [integrations/README.md](./integrations/README.md)); WHOOP and others remain future APIs until scoped.
- **Coach**: visibility into client step, sleep, and heart-rate trends.

### Medium value

- **In-app workout timer**: live session timer, rest countdown, haptics, auto-advance.
- **Push notifications (mobile)**: FCM, APNs, Capacitor plugin, device tokens, preferences + quiet hours.
- **AI coach / chat**: conversational assist with existing AI consent, rate limits, user context.
- **App boundary decoupling**: ✅ complete (core package, Docker, CI path discipline).

### Lower priority

- **Data import**: CSV/JSON (e.g. MyFitnessPal, Strong/Hevy) with validation, dedup, mapping UI.
- **Community forums**: topics, threads, reactions, moderation, search.

---

## Shipped (summary)

The platform has already delivered, among other things:

- **Habits & streaks** — check-ins, streaks, calendar heatmap, ties to health/social.
- **Weekly progress reports** — email + in-app, coach views, Zod `WeeklyReportData`, macros, lifestyle, challenges, habits, PRs, stacks/injections, body deltas, stack tips, etc.
- **Apple Health (Capacitor)** — `@capgo/capacitor-health`, consent, `health-data` APIs, `StepLog` / `SleepLog` / `HeartRateLog`, bidirectional weight/water/workouts, background sync, Studio sync UI, Strava dedup, workout log richness, health sync preferences.
- **Coach analytics** — client progress, timeline, coach dashboard charts, CSV export.
- **Challenges** — groups, leaderboards, Elevate, invites/notifications.
- **Meal planning** — planner grid, auto-plans, grocery from plan, quick-log from plan.
- **Body measurements** — encrypted circumferences, charts, Climb/photo context.
- **Grocery lists** — full CRUD, meal-plan/recipe seed, categories, copy, status.
- **Dashboard** — Performance Hub, date ranges, goals, water, activity heatmap, muscle map, weight, PRs, habits, body summary, challenges, achievements, lifestyle, meal plan, nutrition trends, **heart rate** + **sleep** + **steps** cards, theme cards, date-range-aware charts, etc.
- **Achievements** — milestones, profile, notifications, Elevate.
- **Coach calendar** — availability, booking picker, timezones, `CalendarEvent` on confirm.
- **App architecture** — shared `@varaperformance/core`, no cross-app runtime imports, audited aliases.

For line-by-line historical tasks, use **git log** and ADRs; this file is a **product** overview only.

---

## Reference

- **Third-party cloud health (Google Fit, Garmin, Withings):** [integrations/README.md](./integrations/README.md)
- Mobile / native details: [MOBILE.md](./MOBILE.md), [CAPACITOR.md](./CAPACITOR.md).
- Health integration plan (P0–P5): [PLAN.md](./PLAN.md) (mostly complete; P5 = future OEM APIs).
- Performance work: [OPTIMIZATION.md](./OPTIMIZATION.md).
