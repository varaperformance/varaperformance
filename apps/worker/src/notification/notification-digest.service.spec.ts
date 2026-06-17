import axios from "axios";
import { Prisma } from "@generated/prisma";
import { NotificationDigestService } from "./notification-digest.service";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("NotificationDigestService", () => {
  const db = {
    notification: {
      groupBy: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    profile: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    notificationPreference: {
      findMany: jest.fn(),
    },
  } as any;

  const mailService = {
    sendNotificationDigestEmail: jest.fn(),
  } as any;

  let service: NotificationDigestService;

  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.BACKEND_URL;
    delete process.env.INTERNAL_API_KEY;
    db.user.findMany.mockResolvedValue([]);
    db.notificationPreference.findMany.mockResolvedValue([]);
    db.notification.findMany.mockResolvedValue([]);

    service = new NotificationDigestService(db, mailService);
  });

  it("creates daily digest and pushes realtime when configured", async () => {
    db.notification.groupBy.mockResolvedValueOnce([
      { userId: "user-1", _count: { _all: 5 } },
    ]);
    db.profile.findMany.mockResolvedValueOnce([
      { userId: "user-1", timezone: "UTC" },
    ]);
    db.user.findMany.mockResolvedValueOnce([
      { id: "user-1", email: "user1@test.com" },
    ]);
    db.notificationPreference.findMany.mockResolvedValueOnce([]);
    db.notification.create.mockResolvedValueOnce({ id: "digest-1" });
    db.notification.findMany.mockResolvedValueOnce([]);
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true } } as any);

    process.env.BACKEND_URL = "http://localhost:3000";
    process.env.INTERNAL_API_KEY = "internal-key";

    jest.spyOn(service as any, "getHourInTimezone").mockReturnValue(8);

    await service.processDailyDigests();

    expect(db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          actionUrl: "/notifications",
          idempotencyKey: expect.stringMatching(/^digest:daily:user-1:/),
        }),
      }),
    );

    expect(mockedAxios.post.mock.calls).toHaveLength(1);
    expect(mockedAxios.post.mock.calls[0]).toEqual([
      "http://localhost:3000/v1/notifications/internal/push",
      { notificationId: "digest-1" },
      expect.objectContaining({
        headers: {
          "x-internal-api-key": "internal-key",
        },
      }),
    ]);
  });

  it("skips digest creation when below unread threshold or wrong local hour", async () => {
    db.notification.groupBy.mockResolvedValueOnce([
      { userId: "user-1", _count: { _all: 2 } },
      { userId: "user-2", _count: { _all: 5 } },
    ]);
    db.profile.findMany.mockResolvedValueOnce([
      { userId: "user-2", timezone: "UTC" },
    ]);
    db.user.findMany.mockResolvedValueOnce([]);
    db.notificationPreference.findMany.mockResolvedValueOnce([]);
    jest.spyOn(service as any, "getHourInTimezone").mockReturnValue(7);

    await service.processDailyDigests();

    expect(db.notification.create).not.toHaveBeenCalled();
    expect(mockedAxios.post.mock.calls).toHaveLength(0);
  });

  it("ignores duplicate digest key races", async () => {
    db.notification.groupBy.mockResolvedValueOnce([
      { userId: "user-1", _count: { _all: 5 } },
    ]);
    db.profile.findMany.mockResolvedValueOnce([
      { userId: "user-1", timezone: "UTC" },
    ]);
    db.user.findMany.mockResolvedValueOnce([
      { id: "user-1", email: "user1@test.com" },
    ]);
    db.notificationPreference.findMany.mockResolvedValueOnce([]);
    jest.spyOn(service as any, "getHourInTimezone").mockReturnValue(8);

    db.notification.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(service.processDailyDigests()).resolves.toBeUndefined();
    expect(mockedAxios.post.mock.calls).toHaveLength(0);
  });
});
