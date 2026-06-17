import { NotificationConsumer } from "./notification.consumer";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("NotificationConsumer", () => {
  const createMock = jest.fn();
  const findFirstMock = jest.fn();
  const findUniquePrefMock = jest.fn();
  const db = {
    notification: {
      create: createMock,
      findFirst: findFirstMock,
    },
    notificationPreference: {
      findUnique: findUniquePrefMock,
    },
  } as any;

  const ack = jest.fn();
  const nack = jest.fn();
  const message = { content: "msg", fields: { redelivered: false } };
  const context = {
    getChannelRef: () => ({ ack, nack }),
    getMessage: () => message,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BACKEND_URL;
    delete process.env.INTERNAL_API_KEY;
  });

  it("persists valid notifications and acknowledges message", async () => {
    const payload = {
      userId: "7f26f14f-09eb-4a5a-b541-bd978d5ef9ab",
      type: "BOOKING_APPROVED",
      title: "Booking approved",
      body: "Your booking has been approved",
      actionUrl: "/bookings/123",
      data: { bookingId: "123" },
      timestamp: new Date().toISOString(),
    } as any;

    findFirstMock.mockResolvedValueOnce(null);
    findUniquePrefMock.mockResolvedValueOnce(null);
    createMock.mockResolvedValueOnce({ id: "notification-id" });
    const consumer = new NotificationConsumer(db);

    await consumer.handleNotification(payload, context);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        actionUrl: payload.actionUrl,
        data: payload.data,
        idempotencyKey: expect.any(String),
      },
    });
    expect(ack).toHaveBeenCalledWith(message);
    expect(nack).not.toHaveBeenCalled();
  });

  it("acknowledges and skips invalid notification types", async () => {
    const payload = {
      userId: "7f26f14f-09eb-4a5a-b541-bd978d5ef9ab",
      type: "NOT_A_REAL_TYPE",
      title: "Ignored",
      body: "Ignored",
      timestamp: new Date().toISOString(),
    } as any;

    const consumer = new NotificationConsumer(db);
    await consumer.handleNotification(payload, context);

    expect(createMock).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(message);
    expect(nack).not.toHaveBeenCalled();
  });

  it("nacks message when persistence fails", async () => {
    const payload = {
      userId: "7f26f14f-09eb-4a5a-b541-bd978d5ef9ab",
      type: "PAYMENT_FAILED",
      title: "Payment failed",
      body: "Please update payment method",
      timestamp: new Date().toISOString(),
    } as any;

    findFirstMock.mockResolvedValueOnce(null);
    findUniquePrefMock.mockResolvedValueOnce(null);
    createMock.mockRejectedValueOnce(new Error("db down"));
    const consumer = new NotificationConsumer(db);

    await consumer.handleNotification(payload, context);

    expect(ack).not.toHaveBeenCalled();
    expect(nack).toHaveBeenCalledWith(message, false, true);
  });

  it("calls backend internal push endpoint when realtime bridge is configured", async () => {
    process.env.BACKEND_URL = "http://localhost:3000";
    process.env.INTERNAL_API_KEY = "test-internal-key";

    const payload = {
      userId: "7f26f14f-09eb-4a5a-b541-bd978d5ef9ab",
      type: "BOOKING_APPROVED",
      title: "Booking approved",
      body: "Your booking has been approved",
      timestamp: new Date().toISOString(),
    } as any;

    findFirstMock.mockResolvedValueOnce(null);
    findUniquePrefMock.mockResolvedValueOnce(null);
    createMock.mockResolvedValueOnce({ id: "notification-id" });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } } as any);

    const consumer = new NotificationConsumer(db);
    await consumer.handleNotification(payload, context);

    expect(mockedAxios.post.mock.calls).toHaveLength(1);
    expect(mockedAxios.post.mock.calls[0]).toEqual([
      "http://localhost:3000/v1/notifications/internal/push",
      { notificationId: "notification-id" },
      expect.objectContaining({
        headers: {
          "x-internal-api-key": "test-internal-key",
        },
      }),
    ]);
    expect(ack).toHaveBeenCalledWith(message);
  });
});
