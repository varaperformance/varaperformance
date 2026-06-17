# Roles

This document defines the platform authorization model.

Primary rule: access is enforced by permissions (`resource:action`) at the API layer.
Roles are collections of permissions and are a management convenience, not the runtime gate.

## Roles Overview

| Role          | Description                                             |
| ------------- | ------------------------------------------------------- |
| Administrator | Full system access, can manage all resources            |
| Moderator     | Content moderation, user management                     |
| Coach         | Coaching services, client management, messaging         |
| Client        | Booking services, messaging with coaches, personal data |
| Finance       | Payment and billing management                          |
| ShopManager   | Shop catalog, inventory, discount, and referral ops     |
| Legal         | Legal document management, consent tracking             |
| Support       | Customer support, incident management                   |
| User          | Basic authenticated user, personal health tracking      |

Note: Roles map to permission bundles. Route/controller access must be reasoned about from permissions first.

---

## Permission Format

Permissions follow the pattern: `resource:action`

Actions: `create`, `read`, `update`, `delete`, `*` (all actions)

Special actions (resource-specific): `cancel`, `refund`, `moderate`, `add-note`, `catalog-read`, `catalog-update`, `inventory-read`, `inventory-update`, `discount-read`, `discount-update`, `referral-read`, `referral-update`, `order-read`, `customer-read`, `review-moderate`

---

## Role Permissions

### Administrator

**Wildcard Access:** `*:*`

Has access to all controllers and all endpoints.

---

### Moderator

| Permission             | Description                              |
| ---------------------- | ---------------------------------------- |
| `blog:create`          | Create blog posts                        |
| `blog:read`            | View blog posts (admin)                  |
| `blog:update`          | Update blog posts                        |
| `blog:delete`          | Delete blog posts                        |
| `exercise:create`      | Create exercises                         |
| `exercise:read`        | View exercises (admin)                   |
| `exercise:update`      | Update exercises                         |
| `exercise:delete`      | Delete exercises                         |
| `faq:create`           | Create FAQs and FAQ categories           |
| `faq:read`             | View FAQs and FAQ categories (admin)     |
| `faq:update`           | Update FAQs and FAQ categories           |
| `faq:delete`           | Delete FAQs and FAQ categories           |
| `challenge:create`     | Create challenges                        |
| `challenge:read`       | View challenges (admin)                  |
| `challenge:update`     | Update challenges                        |
| `challenge:delete`     | Delete challenges                        |
| `nutrition:create`     | Create foods (admin)                     |
| `nutrition:read`       | View foods (admin)                       |
| `nutrition:update`     | Update foods (admin)                     |
| `nutrition:delete`     | Delete foods (admin)                     |
| `recipe:create`        | Create recipes / categories              |
| `recipe:read`          | View recipes / categories (admin)        |
| `recipe:update`        | Update recipes / categories              |
| `recipe:delete`        | Delete recipes / categories              |
| `release-note:create`  | Create release notes                     |
| `release-note:read`    | View release notes (admin)               |
| `release-note:update`  | Update release notes                     |
| `release-note:delete`  | Delete release notes                     |
| `spotlight:create`     | Create spotlight stories                 |
| `spotlight:read`       | View spotlight stories (admin)           |
| `spotlight:update`     | Update spotlight stories                 |
| `spotlight:delete`     | Delete spotlight stories                 |
| `user:read`            | View user information                    |
| `user:update`          | Update user status (ban/suspend)         |
| `incident:create`      | Create status incidents                  |
| `incident:update`      | Update incidents                         |
| `incident:add-note`    | Add notes to incidents                   |
| `elevate:moderate`     | Moderate reported social/elevate content |
| `shop:review-moderate` | Edit or delete product reviews           |

**Controllers:** BlogController, ExerciseController, FaqController, StatusController, IdmController (limited), AdminChallengeController, NutritionController (admin), RecipesController (admin), RecipeCategoriesController, ReleaseNotesController, SpotlightController

---

### Coach

| Permission          | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `coach:read`        | View own coach profile                                 |
| `coach:update`      | Update coach profile                                   |
| `coaching:create`   | Create availability slots                              |
| `coaching:read`     | View dashboard, clients, revenue                       |
| `coaching:update`   | Update booking status, packages, availability          |
| `coaching:delete`   | Delete availability slots                              |
| `workout:create`    | Create workout plans for clients                       |
| `workout:read`      | View workout plans                                     |
| `workout:update`    | Update workout plans                                   |
| `workout:delete`    | Delete workout plans                                   |
| `calendar:*`        | Create/view/update/delete calendar events and meetings |
| `elevate:*`         | Social feed, stories, comments, partner actions        |
| `messaging:*`       | Full messaging access                                  |
| `notification:read` | View notifications                                     |

**Controllers:** CoachingController (`/coaches/me/*`), AvailabilityController, WorkoutPlansController, MessagingController, NotificationController

---

### Client

| Permission            | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `booking:create`      | Create coaching bookings                               |
| `booking:read`        | View own bookings                                      |
| `booking:cancel`      | Cancel own bookings                                    |
| `subscription:read`   | View subscriptions                                     |
| `subscription:update` | Pause/resume/cancel subscriptions                      |
| `workout:create`      | Create workout plans                                   |
| `workout:read`        | View workout plans                                     |
| `workout:update`      | Update workout plans                                   |
| `workout:delete`      | Delete workout plans                                   |
| `challenge:create`    | Create challenges                                      |
| `challenge:read`      | View challenges                                        |
| `challenge:update`    | Update/join/withdraw challenges                        |
| `challenge:delete`    | Delete own challenges                                  |
| `climb:create`        | Create climb entries                                   |
| `climb:read`          | View climb entries                                     |
| `climb:delete`        | Delete climb entries                                   |
| `achievement:create`  | Share achievements                                     |
| `achievement:read`    | View achievements                                      |
| `integration:read`    | View integration status                                |
| `integration:update`  | Connect/sync/disconnect integrations                   |
| `calendar:*`          | Create/view/update/delete calendar events and meetings |
| `elevate:*`           | Social feed, stories, comments, partner actions        |
| `messaging:*`         | Full messaging access                                  |
| `notification:read`   | View notifications                                     |
| `profile:*`           | Full profile access                                    |

**Controllers:** CoachingPaymentController, ChallengeController, ClimbController, AchievementsController, StravaIntegrationController, MessagingController, ProfileController, NotificationController

---

### Finance

| Permission            | Description                                     |
| --------------------- | ----------------------------------------------- |
| `payment:read`        | View payment history and commerce order revenue |
| `payment:refund`      | Process refunds                                 |
| `subscription:read`   | View all subscriptions                          |
| `customer:read`       | View customer payment info                      |
| `shop:order-read`     | View shop orders                                |
| `shop:customer-read`  | View shop customers                             |
| `shop:discount-read`  | View discount code analytics                    |
| `shop:referral-read`  | View referral analytics                         |
| `shop:inventory-read` | View inventory levels                           |

**Controllers:** PaymentController, CoachingPaymentController (read-only)

Finance intentionally does not include `shop:catalog-update` or `shop:inventory-update`.

---

### ShopManager

| Permission              | Description                    |
| ----------------------- | ------------------------------ |
| `shop:catalog-read`     | View shop catalog products     |
| `shop:catalog-update`   | Create/update shop products    |
| `shop:inventory-read`   | View inventory levels          |
| `shop:inventory-update` | Adjust inventory               |
| `shop:discount-read`    | View discount codes            |
| `shop:discount-update`  | Create/update discount codes   |
| `shop:referral-read`    | View referral programs         |
| `shop:referral-update`  | Create referral codes/programs |
| `shop:order-read`       | View shop orders               |
| `shop:customer-read`    | View shop customers            |
| `shop:review-moderate`  | Edit or delete product reviews |

**Controllers:** CommerceController (`/v1/commerce/admin/*`)

---

### Legal

| Permission       | Description                |
| ---------------- | -------------------------- |
| `consent:read`   | View consent records       |
| `consent:create` | Create legal documents     |
| `consent:update` | Update legal documents     |
| `legal:*`        | Full legal document access |

**Controllers:** ConsentController

---

### Support

| Permission          | Description                            |
| ------------------- | -------------------------------------- |
| `status:create`     | Create status services                 |
| `incident:create`   | Create incidents                       |
| `incident:update`   | Update incidents                       |
| `incident:add-note` | Add incident notes                     |
| `user:read`         | View user info for support             |
| `faq:read`          | Read FAQ content for support workflows |

**Controllers:** StatusController, FaqController (read-only)

---

### User

| Permission          | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `profile:*`         | Full profile access                                    |
| `health:*`          | Full health tracking access                            |
| `workout:*`         | Full workout plan builder access                       |
| `elevate:*`         | Social feed, stories, comments, partner actions        |
| `calculator:*`      | Use fitness calculators                                |
| `notification:read` | View notifications                                     |
| `calendar:*`        | Create/view/update/delete calendar events and meetings |
| `challenge:*`       | Full challenge access                                  |
| `climb:*`           | Full climb tracking access                             |
| `achievement:*`     | Full achievements access                               |
| `integration:*`     | Full integration access (Strava, etc.)                 |

**Controllers:** ProfileController, SocialsController, CalculatorsController, WeightController, WaterController, StacksController, NotesController, WorkoutSessionsController, PersonalRecordsController, NotificationController, ChallengeController, ClimbController, AchievementsController, StravaIntegrationController

---

## References

- Endpoint/controller permission matrix: `docs/backend/PERMISSIONS.md`
- Permission seed examples: `docs/backend/PERMISSIONS.md`
