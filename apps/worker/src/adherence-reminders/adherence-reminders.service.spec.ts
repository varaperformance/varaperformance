import { createUtcDateKey, getTodayInTimezone } from "@varaperformance/core";
import { AdherenceRemindersService } from "./adherence-reminders.service";

describe("AdherenceRemindersService batching", () => {
  const db = {
    user: {
      findMany: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    stackLog: {
      findMany: jest.fn(),
    },
    climbEntry: {
      findMany: jest.fn(),
    },
  } as any;

  let service: AdherenceRemindersService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AdherenceRemindersService(db);
  });

  it("prefetches stack reminders and logs in batch per user page", async () => {
    const todayKey = getTodayInTimezone("UTC");

    db.user.findMany
      .mockResolvedValueOnce([
        {
          id: "user-1",
          profile: { timezone: "UTC" },
          stacks: [
            {
              id: "stack-1",
              name: "My Stack",
              items: [{ id: "item-1", timeSlot: "MORNING" }],
            },
          ],
        },
        {
          id: "user-2",
          profile: { timezone: "UTC" },
          stacks: [
            {
              id: "stack-2",
              name: "My Stack 2",
              items: [{ id: "item-2", timeSlot: "MORNING" }],
            },
          ],
        },
      ])
      .mockResolvedValueOnce([]);

    db.notification.findMany.mockResolvedValueOnce([]);
    db.stackLog.findMany.mockResolvedValueOnce([]);
    db.notification.createMany.mockResolvedValue({ count: 1 });

    jest.spyOn(service as any, "getDueSlots").mockReturnValue(["MORNING"]);
    jest.spyOn(service as any, "getHourInTimezone").mockReturnValue(12);

    await (service as any).sendStackSlotReminders();

    expect(db.notification.findMany).toHaveBeenCalledTimes(1);
    expect(db.stackLog.findMany).toHaveBeenCalledTimes(1);
    expect(db.notification.createMany).toHaveBeenCalledTimes(2);

    const firstInsert =
      db.notification.createMany.mock.calls[0]?.[0]?.data?.[0];
    expect(firstInsert.idempotencyKey).toContain(
      `adherence:stack:user-1:${todayKey}:MORNING`,
    );
  });

  it("prefetches daily climb entries by user/date batch", async () => {
    const todayKey = getTodayInTimezone("UTC");
    const todayDate = createUtcDateKey(todayKey);

    db.user.findMany
      .mockResolvedValueOnce([
        {
          id: "user-1",
          profile: { timezone: "UTC" },
        },
        {
          id: "user-2",
          profile: { timezone: "UTC" },
        },
      ])
      .mockResolvedValueOnce([]);

    db.climbEntry.findMany.mockResolvedValueOnce([
      {
        userId: "user-2",
        capturedDate: todayDate,
      },
    ]);

    db.notification.createMany.mockResolvedValue({ count: 1 });
    jest.spyOn(service as any, "getHourInTimezone").mockReturnValue(20);

    await (service as any).sendDailyClimbSelfieReminders();

    expect(db.climbEntry.findMany).toHaveBeenCalledTimes(1);
    expect(db.notification.createMany).toHaveBeenCalledTimes(1);

    const inserted = db.notification.createMany.mock.calls[0]?.[0]?.data?.[0];
    expect(inserted.userId).toBe("user-1");
    expect(inserted.idempotencyKey).toContain(
      `adherence:climb:user-1:${todayKey}`,
    );
  });
});
