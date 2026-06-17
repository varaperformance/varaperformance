# Notifications System

This document explains how to wire up notifications in the Vara Performance platform.

## Architecture Overview

The notification system consists of:

1. **NotificationService** - Creates notifications in the database
2. **NotificationGateway** - Pushes real-time notifications via Socket.IO
3. **NotificationQueueService** - Helper methods for queue-based notifications (optional)

### Direct Push Pattern (Recommended)

For real-time notifications, use the direct push pattern:

```typescript
// 1. Inject the services
constructor(
  private readonly notificationService: NotificationService,
  private readonly notificationGateway: NotificationGateway,
) {}

// 2. Create and push the notification
const notification = await this.notificationService.create({
  userId: targetUserId,
  type: 'NOTIFICATION_TYPE',
  title: 'Notification Title',
  body: 'Notification message body',
  actionUrl: '/where/to/navigate', // Optional
  data: { key: 'value' }, // Optional metadata
});

this.notificationGateway.sendToUser(targetUserId, notification);
```

## Notification Types

Defined in `prisma/schema/notification.prisma`:

| Type                     | Description                       | Status                   |
| ------------------------ | --------------------------------- | ------------------------ |
| `BOOKING_REQUESTED`      | Client requested a booking        | ✅ Wired                 |
| `BOOKING_APPROVED`       | Coach approved the booking        | ✅ Wired                 |
| `BOOKING_CONFIRMED`      | Payment confirmed, booking active | ✅ Wired                 |
| `BOOKING_CANCELLED`      | Booking was cancelled             | ✅ Wired                 |
| `MESSAGE_RECEIVED`       | New message in conversation       | ✅ Wired                 |
| `PAYMENT_RECEIVED`       | Coach received payment            | ✅ Wired                 |
| `PAYMENT_FAILED`         | Payment processing failed         | ⏳ Needs webhook         |
| `SUBSCRIPTION_RENEWED`   | Subscription auto-renewed         | ⏳ Needs webhook         |
| `SUBSCRIPTION_CANCELLED` | Subscription cancelled            | ⏳ Needs webhook         |
| `SYSTEM_ANNOUNCEMENT`    | Platform announcement             | ⏳ Needs admin feature   |
| `PROFILE_VERIFIED`       | User profile verified             | ⏳ Needs admin feature   |
| `REVIEW_RECEIVED`        | Coach received a review           | ⏳ Needs review endpoint |

## Adding a New Notification Type

### Step 1: Add to Prisma Enum

Edit `apps/backend/prisma/schema/notification.prisma`:

```prisma
enum NotificationType {
  // ... existing types
  YOUR_NEW_TYPE
}
```

Run migration:

```bash
cd apps/backend
pnpm prisma migrate dev --name add_your_new_type
```

### Step 2: Import NotificationModule

In your module file:

```typescript
import { NotificationModule } from "@app/common";

@Module({
  imports: [
    NotificationModule,
    // ... other imports
  ],
})
export class YourModule {}
```

### Step 3: Inject Services

In your service:

```typescript
import { NotificationService, NotificationGateway } from "@app/common";

@Injectable()
export class YourService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}
}
```

### Step 4: Send Notification

In the appropriate method:

```typescript
async yourMethod() {
  // ... your business logic

  // Create and push notification
  const notification = await this.notificationService.create({
    userId: targetUserId,
    type: 'YOUR_NEW_TYPE',
    title: 'Your Title',
    body: 'Your message',
    actionUrl: '/relevant/page',
    data: { relatedId: someId },
  });

  this.notificationGateway.sendToUser(targetUserId, notification);
}
```

### Step 5: Add Helper Method (Optional)

For reusability, add a helper to `notification-queue.service.ts`:

```typescript
yourNewType(
  userId: string,
  data: { field1: string; field2: string },
): void {
  this.send({
    userId,
    type: 'YOUR_NEW_TYPE',
    title: 'Your Title',
    body: `Message with ${data.field1}`,
    actionUrl: `/page?id=${data.field2}`,
    data,
  });
}
```

## Wiring Examples

### Booking Requested (notifies coach)

Location: `apps/backend/src/payment/services/coaching-payment.service.ts`

```typescript
// After successful payment initiation
const notification = await this.notificationService.create({
  userId: coachPackage.coach.user.id,
  type: "BOOKING_REQUESTED",
  title: "New Booking Request",
  body: `${user.firstName} ${user.lastName} requested ${coachPackage.name}`,
  actionUrl: `/coaches/dashboard?tab=bookings`,
  data: { bookingId: booking.id },
});

this.notificationGateway.sendToUser(coachPackage.coach.user.id, notification);
```

### Booking Approved (notifies client)

Location: `apps/backend/src/coaching/coaching.service.ts`

```typescript
// After coach approves booking
const notification = await this.notificationService.create({
  userId: booking.user.id,
  type: "BOOKING_APPROVED",
  title: "Booking Approved!",
  body: `Your booking for ${booking.coachPackage.name} has been approved`,
  actionUrl: `/my-coaching`,
  data: { bookingId: booking.id },
});

this.notificationGateway.sendToUser(booking.user.id, notification);
```

### Message Received

Location: `apps/backend/src/messaging/messaging.service.ts`

```typescript
// After message is created
const notification = await this.notificationService.create({
  userId: recipientId,
  type: "MESSAGE_RECEIVED",
  title: `Message from ${senderName}`,
  body: messagePreview,
  actionUrl: `/messages?conversation=${conversationId}`,
  data: { conversationId },
});

this.notificationGateway.sendToUser(recipientId, notification);
```

## Frontend Integration

### Socket.IO Connection

The frontend connects to the notification namespace:

```typescript
const socket = io(`${API_URL}/notifications`, {
  withCredentials: true,
  transports: ["websocket", "polling"],
});

socket.on("notification", (notification) => {
  // Handle incoming notification
  addNotification(notification);
  showToast(notification);
});
```

### Using the Hook

```tsx
import { useNotifications } from "@/hooks/use-notifications";

function MyComponent() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  return (
    <NotificationBell count={unreadCount}>
      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          onRead={() => markAsRead(n.id)}
        />
      ))}
    </NotificationBell>
  );
}
```

## API Endpoints

| Method | Endpoint                     | Description                 |
| ------ | ---------------------------- | --------------------------- |
| GET    | `/v1/notifications`          | Get paginated notifications |
| PATCH  | `/v1/notifications/:id/read` | Mark notification as read   |
| PATCH  | `/v1/notifications/read-all` | Mark all as read            |
| DELETE | `/v1/notifications/:id`      | Delete a notification       |

## Queue-Based Notifications (Alternative)

For background processing, use the queue service:

```typescript
import { NotificationQueueService } from "@app/common";

@Injectable()
export class YourService {
  constructor(private readonly notificationQueue: NotificationQueueService) {}

  async yourMethod() {
    // Queue will process in worker
    this.notificationQueue.bookingApproved(userId, {
      packageName: "Premium Coaching",
      coachName: "John Doe",
      bookingId: "abc123",
    });
  }
}
```

**Note:** Queue-based notifications are processed by the worker service and won't push real-time updates unless the worker also uses the gateway.

## Troubleshooting

### Notifications not appearing in real-time

1. Check Socket.IO connection in browser dev tools
2. Verify user is authenticated (JWT cookie present)
3. Check `NotificationGateway.sendToUser()` is being called
4. Verify room name matches: `user:${userId}`

### 403 Forbidden on notification endpoints

1. Ensure `@Public()` decorator is not present
2. Verify JWT token is valid
3. Check `JwtAuthGuard` is applied

### Socket connection failing

1. Check CORS configuration allows your frontend origin
2. Verify cookie credentials are being sent
3. Check JWT_SECRET matches across services
