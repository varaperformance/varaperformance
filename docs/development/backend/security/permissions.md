# Permissions

This document is the source of truth for API access control at endpoint/controller level.

Primary rule: access is enforced by permissions (`resource:action`) at the API layer.
Roles are assignment bundles and are not runtime authorization gates.

## Permission Format

Permissions follow the pattern: `resource:action`

Actions: `create`, `read`, `update`, `delete`, `*` (all actions)

---

## Controller Permission Matrix

### Public Endpoints (No Auth Required)

| Controller             | Endpoints                                                                                                                                                      | Notes                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| CoachingController     | `GET /coaches`, `GET /coaches/featured`, `GET /coaches/:slug`, `GET /coaches/:id/reviews`, `GET /coaches/:id/contract`                                         | Public coach discovery            |
| ContractController     | `GET /coaches/:coachId/contract/active`                                                                                                                        | Public active coach contract      |
| BlogController         | `GET /blogs`, `GET /blogs/:slug`                                                                                                                               | Public blog access                |
| SpotlightController    | `GET /spotlight/public`, `GET /spotlight/public/:slug`                                                                                                         | Public spotlight feed             |
| FaqController          | `GET /faq/public`, `GET /faq/featured`, `POST /faq/:id/view`                                                                                                   | Public FAQ browse + view tracking |
| ExerciseController     | `GET /exercises`, `GET /exercises/:slug`                                                                                                                       | Public exercise library           |
| CalculatorsController  | `POST /calculators/*`                                                                                                                                          | Public calculators API            |
| StatusController       | `GET /status/services`, `GET /status/incidents`, `GET /status/github`                                                                                          | Public status page                |
| SystemHealthController | `GET /system-health*`                                                                                                                                          | Public health probes              |
| ConsentController      | `GET /consent/legal/active`, `GET /consent/legal/:type`                                                                                                        | Public legal docs                 |
| LegalController        | `GET /consent/legal/active`                                                                                                                                    | Public active legal docs          |
| PaymentController      | `GET /payments/pricing/plans`, `GET /payments/settings/platform-fee`                                                                                           | Public pricing and fee settings   |
| CommerceController     | `GET /commerce/catalog`, `GET /commerce/products/:productId`, `POST /commerce/checkout/session`, `GET /commerce/products/:productId/reviews` | Public shop browsing + checkout   |
| IdmController          | `POST /idm/register`, `POST /idm/login`, `POST /idm/verify`, `POST /idm/forgot-password`, `POST /idm/reset-password`, `POST /idm/refresh`, `POST /idm/oauth/*` | Auth endpoints                    |
| WebhookController      | `POST /webhooks/stripe`                                                                                                                                        | Payment webhooks                  |

---

### Authenticated Endpoints (By Controller)

Note: "Roles" column is informational (typical assignment), while "Required Permission" is the enforced gate.

#### IdmController (`/v1/idm`)

| Endpoint           | Method | Required Permission | Roles |
| ------------------ | ------ | ------------------- | ----- |
| `/me`              | GET    | _authenticated_     | All   |
| `/change-password` | POST   | _authenticated_     | All   |
| `/logout`          | POST   | _authenticated_     | All   |
| `/logout-all`      | POST   | _authenticated_     | All   |

---

#### IdmController Admin (`/v1/idm/admin`)

| Endpoint                                 | Method | Required Permission | Roles         |
| ---------------------------------------- | ------ | ------------------- | ------------- |
| `/admin/users`                           | GET    | `admin:read`        | Administrator |
| `/admin/users/:id`                       | GET    | `admin:read`        | Administrator |
| `/admin/users/:id/status`                | PATCH  | `admin:update`      | Administrator |
| `/admin/users/:userId/roles/:roleId`     | POST   | `admin:create`      | Administrator |
| `/admin/users/:userId/roles/:roleId`     | DELETE | `admin:delete`      | Administrator |
| `/admin/users/:userId/permissions/:id`   | POST   | `admin:create`      | Administrator |
| `/admin/users/:userId/permissions/:id`   | DELETE | `admin:delete`      | Administrator |
| `/admin/roles`                           | GET    | `admin:read`        | Administrator |
| `/admin/roles/:id`                       | GET    | `admin:read`        | Administrator |
| `/admin/roles/:roleId/permissions/:id`   | POST   | `admin:create`      | Administrator |
| `/admin/roles/:roleId/permissions/:id`   | DELETE | `admin:delete`      | Administrator |
| `/admin/permissions`                     | GET    | `admin:read`        | Administrator |
| `/admin/private-mode`                    | GET    | `admin:read`        | Administrator |
| `/admin/private-mode`                    | PATCH  | `admin:update`      | Administrator |
| `/admin/private-mode/codes`              | POST   | `admin:update`      | Administrator |

---

#### ProfileController (`/v1/profile`)

| Endpoint              | Method  | Required Permission | Roles               |
| --------------------- | ------- | ------------------- | ------------------- |
| `/`                   | GET     | `profile:read`      | User, Client, Coach |
| `/details`            | GET     | `profile:read`      | User, Client, Coach |
| `/`                   | PUT     | `profile:update`    | User, Client, Coach |
| `/complete`           | POST    | `profile:update`    | User, Client, Coach |
| `/check-display-name` | GET     | `profile:read`      | User, Client, Coach |
| `/gyms`               | GET/PUT | `profile:*`         | User, Client, Coach |
| `/avatar`             | POST    | `profile:update`    | User, Client, Coach |

---

#### SocialsController (`/v1/socials`)

| Endpoint | Method | Required Permission | Roles               |
| -------- | ------ | ------------------- | ------------------- |
| `/`      | GET    | `profile:read`      | User, Client, Coach |
| `/`      | PUT    | `profile:update`    | User, Client, Coach |
| `/`      | DELETE | `profile:delete`    | User, Client, Coach |

---

#### GymsController (`/v1/gyms`)

| Endpoint                        | Method | Required Permission | Roles                    |
| ------------------------------- | ------ | ------------------- | ------------------------ |
| `/`                             | GET    | _authenticated_     | All                      |
| `/:id`                          | GET    | _authenticated_     | All                      |
| `/`                             | POST   | `gym:create`        | Administrator, Moderator |
| `/:id`                          | PATCH  | `gym:update`        | Administrator, Moderator |
| `/:id`                          | DELETE | `gym:delete`        | Administrator            |
| `/:gymId/locations`             | POST   | `gym:create`        | Administrator, Moderator |
| `/:gymId/locations/:locationId` | PATCH  | `gym:update`        | Administrator, Moderator |
| `/:gymId/locations/:locationId` | DELETE | `gym:delete`        | Administrator            |

---

#### MessagingController (`/v1/messaging`)

| Endpoint                               | Method      | Required Permission | Roles         |
| -------------------------------------- | ----------- | ------------------- | ------------- |
| `/conversations`                       | GET         | `messaging:read`    | Client, Coach |
| `/conversations`                       | POST        | `messaging:create`  | Client, Coach |
| `/conversations/:id`                   | GET         | `messaging:read`    | Client, Coach |
| `/conversations/:id/status`            | PATCH       | `messaging:update`  | Client, Coach |
| `/conversations/:id/messages`          | GET         | `messaging:read`    | Client, Coach |
| `/messages`                            | POST        | `messaging:create`  | Client, Coach |
| `/conversations/:id/messages/:id`      | PATCH       | `messaging:update`  | Client, Coach |
| `/conversations/:id/messages/:id`      | DELETE      | `messaging:delete`  | Client, Coach |
| `/conversations/:id/messages/:id/read` | POST        | `messaging:update`  | Client, Coach |
| `/messages/:id/reactions`              | POST/DELETE | `messaging:update`  | Client, Coach |
| `/giphy/*`                             | GET         | `messaging:read`    | Client, Coach |

---

#### NotificationController (`/v1/notifications`)

| Endpoint         | Method | Required Permission   | Roles |
| ---------------- | ------ | --------------------- | ----- |
| `/`              | GET    | `notification:read`   | All   |
| `/unread-count`  | GET    | `notification:read`   | All   |
| `/mark-read`     | POST   | `notification:update` | All   |
| `/mark-all-read` | POST   | `notification:update` | All   |

---

#### CalendarController (`/v1/calendar`)

| Endpoint                | Method | Required Permission | Roles               |
| ----------------------- | ------ | ------------------- | ------------------- |
| `/events`               | GET    | `calendar:read`     | User, Client, Coach |
| `/users/:userId/events` | GET    | `calendar:read`     | User, Client, Coach |
| `/events`               | POST   | `calendar:create`   | User, Client, Coach |
| `/events/:eventId`      | PATCH  | `calendar:update`   | User, Client, Coach |
| `/events/:eventId`      | DELETE | `calendar:delete`   | User, Client, Coach |

---

#### CoachingController (`/v1/coaches`)

| Endpoint                          | Method | Required Permission | Roles  |
| --------------------------------- | ------ | ------------------- | ------ |
| `/me`                             | GET    | `coach:read`        | Coach  |
| `/me/dashboard`                   | GET    | `coaching:read`     | Coach  |
| `/me/availability`                | PATCH  | `coaching:update`   | Coach  |
| `/me/clients`                     | GET    | `coaching:read`     | Coach  |
| `/me/packages`                    | GET    | `coaching:read`     | Coach  |
| `/me/packages`                    | POST   | `coaching:update`   | Coach  |
| `/me/packages/:packageId`         | PATCH  | `coaching:update`   | Coach  |
| `/me/packages/:packageId/archive` | PATCH  | `coaching:update`   | Coach  |
| `/me/clients/:bookingId`          | GET    | `coaching:read`     | Coach  |
| `/me/clients/:bookingId/status`   | PATCH  | `coaching:update`   | Coach  |
| `/me/revenue`                     | GET    | `coaching:read`     | Coach  |
| `/contracts/sign`                 | POST   | `booking:create`    | Client |

---

#### CoachingPaymentController (`/v1/coaching/payments`)

| Endpoint                          | Method | Required Permission   | Roles  |
| --------------------------------- | ------ | --------------------- | ------ |
| `/initiate`                       | POST   | `booking:create`      | Client |
| `/bookings/:id/pay`              | POST   | `booking:create`      | Client |
| `/stripe/connect/onboarding-link` | POST   | `coaching:update`     | Coach  |
| `/stripe/connect/status`          | GET    | `coaching:read`       | Coach  |
| `/stripe/connect/disconnect`      | POST   | `coaching:update`     | Coach  |
| `/bookings`                       | GET    | `booking:read`        | Client |
| `/bookings/:id/cancel`            | POST   | `booking:cancel`      | Client |
| `/subscriptions/:id/pause`        | POST   | `subscription:update` | Client |
| `/subscriptions/:id/resume`       | POST   | `subscription:update` | Client |
| `/subscriptions/:id/cancel`       | POST   | `subscription:update` | Client |

---

#### PaymentController (`/v1/payments`)

| Endpoint                              | Method | Required Permission | Roles                  |
| ------------------------------------- | ------ | ------------------- | ---------------------- |
| `/history`                            | GET    | `payment:read`      | Client, Finance        |
| `/admin/subscriptions`                | GET    | `payment:read`      | Finance, Administrator |
| `/admin/payments`                     | GET    | `payment:read`      | Finance, Administrator |
| `/admin/stats`                        | GET    | `payment:read`      | Finance, Administrator |
| `/admin/pricing/plans`                | GET    | `payment:read`      | Finance, Administrator |
| `/admin/pricing/plans`                | POST   | `payment:update`    | Finance, Administrator |
| `/admin/pricing/plans/:pricingPlanId` | PATCH  | `payment:update`    | Finance, Administrator |
| `/admin/settings/platform-fee`        | GET    | `payment:read`      | Finance, Administrator |
| `/admin/settings/platform-fee`        | PATCH  | `payment:update`    | Finance, Administrator |

#### PaymentController Public Endpoints (`/v1/payments`)

| Endpoint                 | Method | Required Permission | Roles |
| ------------------------ | ------ | ------------------- | ----- |
| `/pricing/plans`         | GET    | _public_            | All   |
| `/settings/platform-fee` | GET    | _public_            | All   |

---

#### CommerceController (`/v1/commerce`)

| Endpoint                    | Method | Required Permission                   | Roles                               |
| --------------------------- | ------ | ------------------------------------- | ----------------------------------- |
| `/admin/catalog`            | GET    | `shop:catalog-read`                   | ShopManager, Administrator          |
| `/admin/catalog`            | POST   | `shop:catalog-update`                 | ShopManager, Administrator          |
| `/admin/catalog/:productId` | PATCH  | `shop:catalog-update`                 | ShopManager, Administrator          |
| `/admin/inventory`          | GET    | `shop:inventory-read`                 | ShopManager, Finance, Administrator |
| `/admin/inventory/adjust`   | POST   | `shop:inventory-update`               | ShopManager, Administrator          |
| `/admin/discount-codes`     | GET    | `shop:discount-read`                  | ShopManager, Finance, Administrator |
| `/admin/discount-codes`     | POST   | `shop:discount-update`                | ShopManager, Administrator          |
| `/admin/discount-codes/:id` | PATCH  | `shop:discount-update`                | ShopManager, Administrator          |
| `/admin/referrals`          | GET    | `shop:referral-read`                  | ShopManager, Finance, Administrator |
| `/admin/referrals/codes`    | POST   | `shop:referral-update`                | ShopManager, Administrator          |
| `/admin/orders`             | GET    | `payment:read` + `shop:order-read`    | Finance, ShopManager, Administrator |
| `/admin/customers`          | GET    | `payment:read` + `shop:customer-read` | Finance, ShopManager, Administrator |

#### Review Moderation

| Endpoint              | Method | Required Permission    | Roles                              |
| --------------------- | ------ | ---------------------- | ---------------------------------- |
| `/reviews/:reviewId`  | PATCH  | `shop:review-moderate` | Moderator, ShopManager, Administrator |
| `/reviews/:reviewId`  | DELETE | `shop:review-moderate` | Moderator, ShopManager, Administrator |

Note: public shop catalog and checkout endpoints are intentionally unauthenticated and listed in Public Endpoints.

---

#### FaqController (`/v1/faq`)

| Endpoint          | Method | Required Permission | Roles                             |
| ----------------- | ------ | ------------------- | --------------------------------- |
| `/categories`     | GET    | `faq:read`          | Administrator, Moderator, Support |
| `/categories/:id` | GET    | `faq:read`          | Administrator, Moderator, Support |
| `/categories`     | POST   | `faq:create`        | Administrator, Moderator          |
| `/categories/:id` | PATCH  | `faq:update`        | Administrator, Moderator          |
| `/categories/:id` | DELETE | `faq:delete`        | Administrator, Moderator          |
| `/`               | GET    | `faq:read`          | Administrator, Moderator, Support |
| `/:id`            | GET    | `faq:read`          | Administrator, Moderator, Support |
| `/`               | POST   | `faq:create`        | Administrator, Moderator          |
| `/:id`            | PATCH  | `faq:update`        | Administrator, Moderator          |
| `/:id`            | DELETE | `faq:delete`        | Administrator, Moderator          |

---

#### LegalController (`/v1/consent/legal`)

| Endpoint                     | Method | Required Permission | Roles                |
| ---------------------------- | ------ | ------------------- | -------------------- |
| `/admin`                     | GET    | `legal:read`        | Legal, Administrator |
| `/admin/type/:type/versions` | GET    | `legal:read`        | Legal, Administrator |
| `/admin/:id/verify`          | GET    | `legal:read`        | Legal, Administrator |
| `/admin/:id`                 | GET    | `legal:read`        | Legal, Administrator |
| `/admin`                     | POST   | `legal:create`      | Legal, Administrator |
| `/admin/:id/version`         | POST   | `legal:update`      | Legal, Administrator |

---

#### SpotlightController (`/v1/spotlight`)

| Endpoint  | Method | Required Permission  | Roles                    |
| --------- | ------ | -------------------- | ------------------------ |
| `/submit` | POST   | _authenticated_      | User, Client, Coach      |
| `/`       | GET    | `spotlight:read`     | Administrator, Moderator |
| `/:id`    | GET    | `spotlight:read`     | Administrator, Moderator |
| `/`       | POST   | `spotlight:create`   | Administrator, Moderator |
| `/:id`    | PATCH  | `spotlight:update`   | Administrator, Moderator |
| `/:id`    | DELETE | `spotlight:delete`   | Administrator, Moderator |

---

#### SystemHealthController (`/v1/system-health`)

| Endpoint    | Method | Required Permission | Roles         |
| ----------- | ------ | ------------------- | ------------- |
| `/`         | GET    | _public_            | All           |
| `/ready`    | GET    | _public_            | All           |
| `/full`     | GET    | _public_            | All           |
| `/database` | GET    | _public_            | All           |
| `/redis`    | GET    | _public_            | All           |
| `/rabbitmq` | GET    | _public_            | All           |
| `/dlq`      | GET    | `admin:read`        | Administrator |

---

#### BlogController (`/v1/blogs`)

| Endpoint      | Method | Required Permission | Roles                    |
| ------------- | ------ | ------------------- | ------------------------ |
| `/create`     | POST   | `blog:create`       | Administrator, Moderator |
| `/slug/:slug` | GET    | `blog:create`       | Administrator, Moderator |
| `/:slug`      | PATCH  | `blog:update`       | Administrator, Moderator |
| `/:slug`      | DELETE | `blog:delete`       | Administrator, Moderator |

---

#### StatusController (`/v1/status`)

| Endpoint             | Method | Required Permission | Roles                             |
| -------------------- | ------ | ------------------- | --------------------------------- |
| `/create-service`    | POST   | `status:create`     | Administrator, Support            |
| `/create-incident`   | POST   | `incident:create`   | Administrator, Support, Moderator |
| `/update-incident`   | PATCH  | `incident:update`   | Administrator, Support, Moderator |
| `/add-incident-note` | POST   | `incident:add-note` | Administrator, Support, Moderator |

---

#### ConsentController (`/v1/consent`)

| Endpoint          | Method | Required Permission | Roles              |
| ----------------- | ------ | ------------------- | ------------------ |
| `/user`           | GET    | `consent:read`      | All (own consents) |
| `/user/reconsent` | POST   | `consent:update`    | All (own consents) |
| `/user/revoke`    | POST   | `consent:update`    | All (own consents) |

---

#### ElevateController (`/v1/elevate`)

| Endpoint                   | Method          | Required Permission                                  | Roles                    |
| -------------------------- | --------------- | ---------------------------------------------------- | ------------------------ |
| `/`                        | GET             | `elevate:read`                                       | User, Client, Coach      |
| `/feed`                    | GET             | `elevate:read`                                       | User, Client, Coach      |
| `/:id`                     | GET             | `elevate:read`                                       | User, Client, Coach      |
| `/stories`                 | GET/POST        | `elevate:read` / `elevate:create`                    | User, Client, Coach      |
| `/stories/upload`          | POST            | `elevate:create`                                     | User, Client, Coach      |
| `/stories/:storyId/view`   | POST            | `elevate:create`                                     | User, Client, Coach      |
| `/stories/:storyId`        | DELETE          | `elevate:delete`                                     | User, Client, Coach      |
| `/:id/comments`            | GET/POST        | `elevate:read` / `elevate:create`                    | User, Client, Coach      |
| `/comments/:commentId`     | PATCH/DELETE    | `elevate:update` / `elevate:delete`                  | User, Client, Coach      |
| `/:id/high-five`           | POST            | `elevate:create`                                     | User, Client, Coach      |
| `/:id/save`                | POST            | `elevate:create`                                     | User, Client, Coach      |
| `/:id/report`              | POST            | `elevate:create`                                     | User, Client, Coach      |
| `/upload`                  | POST            | `elevate:create`                                     | User, Client, Coach      |
| `/partners*`               | GET/POST/DELETE | `elevate:read` / `elevate:create` / `elevate:delete` | User, Client, Coach      |
| `/profile-stats`           | GET             | `elevate:read`                                       | User, Client, Coach      |
| `/gym-stats`               | GET             | `elevate:read`                                       | User, Client, Coach      |
| `/admin/reports`           | GET             | `elevate:moderate`                                   | Moderator, Administrator |
| `/admin/reports/:reportId` | PATCH           | `elevate:moderate`                                   | Moderator, Administrator |
| `/admin/posts/:postId`     | DELETE          | `elevate:moderate`                                   | Moderator, Administrator |

---

#### ContractController (`/v1/coaches`)

| Endpoint                      | Method | Required Permission | Roles         |
| ----------------------------- | ------ | ------------------- | ------------- |
| `/me/contracts`               | GET    | `coaching:read`     | Coach         |
| `/me/contracts/versions`      | GET    | `coaching:read`     | Coach         |
| `/me/contracts/:id`           | GET    | `coaching:read`     | Coach         |
| `/me/contracts/:id/verify`    | GET    | `coaching:read`     | Coach         |
| `/me/contracts`               | POST   | `coaching:update`   | Coach         |
| `/me/contracts/:id/version`   | POST   | `coaching:update`   | Coach         |
| `/contracts/admin`            | GET    | `contract:read`     | Administrator |
| `/contracts/admin/:id`        | GET    | `contract:read`     | Administrator |
| `/contracts/admin/:id/verify` | GET    | `contract:read`     | Administrator |

---

#### AdminController (`/v1/admin`)

| Endpoint      | Method | Required Permission | Roles                    |
| ------------- | ------ | ------------------- | ------------------------ |
| `/stats`      | GET    | `admin:read`        | Administrator, Moderator |
| `/dau`        | GET    | `admin:read`        | Administrator, Moderator |
| `/audit-logs` | GET    | `admin:read`        | Administrator, Moderator |

---

#### Health Controllers (`/v1/weight`, `/v1/water`, `/v1/stacks`, `/v1/notes`, `/v1/workout-sessions`, `/v1/personal-records`, `/v1/workout-goal`)

| Controller                | Required Permission                                                                                                           | Roles                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| NutritionController       | `health:*` for user nutrition flows; admin food management: `nutrition:read/create/update/delete`                             | User, Client, Coach, Moderator, Administrator |
| WeightController          | `health:*`                                                                                                                    | User, Client, Coach                           |
| WaterController           | `health:*`                                                                                                                    | User, Client, Coach                           |
| StacksController          | `health:*`                                                                                                                    | User, Client, Coach                           |
| NotesController           | `health:*`                                                                                                                    | User, Client, Coach                           |
| WorkoutSessionsController | `health:*`                                                                                                                    | User, Client, Coach                           |
| PersonalRecordsController | `health:*`                                                                                                                    | User, Client, Coach                           |
| WorkoutGoalController     | `health:read`, `health:update`                                                                                                | User, Client, Coach                           |
| WorkoutPlansController    | `workout:*` (plus coach routes using `coaching:*`)                                                                            | User, Client, Coach                           |
| RecipesController         | `health:*` for user recipe flows; admin: `recipe:read`, `recipe:update`                                                       | User, Client, Coach, Moderator, Administrator |
| RecipeCategoriesController| `recipe:create/read/update/delete`                                                                                            | Moderator, Administrator                      |
| ClimbController           | `climb:read/create/delete`                                                                                                    | User, Client, Coach                           |
| ChallengeController       | `challenge:create/read/update/delete`                                                                                         | User, Client, Coach                           |
| AdminChallengeController  | `challenge:create/read/update/delete`                                                                                         | Moderator, Administrator                      |
| AchievementsController    | `achievement:read/create`                                                                                                     | User, Client, Coach                           |
| StravaIntegrationController| `integration:read/update`                                                                                                    | User, Client, Coach                           |

---

## Permission Seeds

To seed the permissions into the database:

```typescript
// Example permission seed structure
const permissions = [
  // Profile
  { resource: "profile", action: "create" },
  { resource: "profile", action: "read" },
  { resource: "profile", action: "update" },
  { resource: "profile", action: "delete" },

  // Messaging
  { resource: "messaging", action: "create" },
  { resource: "messaging", action: "read" },
  { resource: "messaging", action: "update" },
  { resource: "messaging", action: "delete" },

  // Coaching
  { resource: "coach", action: "read" },
  { resource: "coach", action: "update" },
  { resource: "coaching", action: "read" },
  { resource: "coaching", action: "update" },

  // FAQ
  { resource: "faq", action: "create" },
  { resource: "faq", action: "read" },
  { resource: "faq", action: "update" },
  { resource: "faq", action: "delete" },

  // Elevate / Social
  { resource: "elevate", action: "create" },
  { resource: "elevate", action: "read" },
  { resource: "elevate", action: "update" },
  { resource: "elevate", action: "delete" },
  { resource: "elevate", action: "moderate" },

  // Bookings
  { resource: "booking", action: "create" },
  { resource: "booking", action: "read" },
  { resource: "booking", action: "cancel" },

  // Subscriptions
  { resource: "subscription", action: "read" },
  { resource: "subscription", action: "update" },

  // Payments
  { resource: "payment", action: "read" },
  { resource: "payment", action: "refund" },

  // Shop
  { resource: "shop", action: "catalog-read" },
  { resource: "shop", action: "catalog-update" },
  { resource: "shop", action: "inventory-read" },
  { resource: "shop", action: "inventory-update" },
  { resource: "shop", action: "discount-read" },
  { resource: "shop", action: "discount-update" },
  { resource: "shop", action: "referral-read" },
  { resource: "shop", action: "referral-update" },
  { resource: "shop", action: "order-read" },
  { resource: "shop", action: "customer-read" },

  // Notifications
  { resource: "notification", action: "read" },
  { resource: "notification", action: "update" },

  // Calendar
  { resource: "calendar", action: "create" },
  { resource: "calendar", action: "read" },
  { resource: "calendar", action: "update" },
  { resource: "calendar", action: "delete" },

  // Health
  { resource: "health", action: "create" },
  { resource: "health", action: "read" },
  { resource: "health", action: "update" },
  { resource: "health", action: "delete" },

  // Workout plans
  { resource: "workout", action: "create" },
  { resource: "workout", action: "read" },
  { resource: "workout", action: "update" },
  { resource: "workout", action: "delete" },

  // Blog
  { resource: "blog", action: "create" },
  { resource: "blog", action: "read" },
  { resource: "blog", action: "update" },
  { resource: "blog", action: "delete" },

  // Gym
  { resource: "gym", action: "create" },
  { resource: "gym", action: "read" },
  { resource: "gym", action: "update" },
  { resource: "gym", action: "delete" },

  // Exercise
  { resource: "exercise", action: "create" },
  { resource: "exercise", action: "read" },
  { resource: "exercise", action: "update" },
  { resource: "exercise", action: "delete" },

  // Status/Incidents
  { resource: "status", action: "create" },
  { resource: "incident", action: "create" },
  { resource: "incident", action: "update" },
  { resource: "incident", action: "add-note" },

  // Consent/Legal
  { resource: "consent", action: "read" },
  { resource: "consent", action: "create" },
  { resource: "consent", action: "update" },
  { resource: "legal", action: "create" },
  { resource: "legal", action: "update" },

  // User management
  { resource: "user", action: "read" },
  { resource: "user", action: "update" },
  { resource: "user", action: "delete" },

  // Admin/system
  { resource: "admin", action: "create" },
  { resource: "admin", action: "read" },
  { resource: "admin", action: "update" },
  { resource: "admin", action: "delete" },

  // Challenge
  { resource: "challenge", action: "create" },
  { resource: "challenge", action: "read" },
  { resource: "challenge", action: "update" },
  { resource: "challenge", action: "delete" },

  // Marketing
  { resource: "marketing", action: "create" },
  { resource: "marketing", action: "read" },
  { resource: "marketing", action: "update" },
  { resource: "marketing", action: "delete" },

  // Team
  { resource: "team", action: "read" },
  { resource: "team", action: "update" },

  // Contract
  { resource: "contract", action: "read" },

  // Nutrition (admin food management)
  { resource: "nutrition", action: "create" },
  { resource: "nutrition", action: "read" },
  { resource: "nutrition", action: "update" },
  { resource: "nutrition", action: "delete" },

  // Recipe
  { resource: "recipe", action: "create" },
  { resource: "recipe", action: "read" },
  { resource: "recipe", action: "update" },
  { resource: "recipe", action: "delete" },

  // Release notes
  { resource: "release-note", action: "create" },
  { resource: "release-note", action: "read" },
  { resource: "release-note", action: "update" },
  { resource: "release-note", action: "delete" },

  // Spotlight
  { resource: "spotlight", action: "create" },
  { resource: "spotlight", action: "read" },
  { resource: "spotlight", action: "update" },
  { resource: "spotlight", action: "delete" },

  // Climb
  { resource: "climb", action: "create" },
  { resource: "climb", action: "read" },
  { resource: "climb", action: "delete" },

  // Integration
  { resource: "integration", action: "read" },
  { resource: "integration", action: "update" },

  // Achievement
  { resource: "achievement", action: "create" },
  { resource: "achievement", action: "read" },

  // Customer
  { resource: "customer", action: "read" },
];
```

---

## Notes

1. **Owner-based access**: Many endpoints (profile, bookings, messages) automatically filter by the authenticated user's ID, so permissions control _capability_ while the service enforces _ownership_.

2. **Wildcard permissions**: Administrator role uses `*:*` which should be checked first in the authorization guard.

3. **Frontend policy**: Web route and sidebar gating should use permission checks (`requiredPermission`, `hasPermission`) rather than role checks.

4. **Future permissions**: As new features are added, follow the `resource:action` pattern and update this document.
