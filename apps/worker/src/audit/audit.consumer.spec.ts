import { AuditConsumer } from "./audit.consumer";
import { EncryptionService } from "@app/security";

describe("AuditConsumer", () => {
  const createMock = jest.fn();
  const findFirstMock = jest.fn();
  const db = {
    auditLog: {
      create: createMock,
      findFirst: findFirstMock,
    },
  } as any;
  const encryption = new EncryptionService() as any;

  const ack = jest.fn();
  const nack = jest.fn();
  const message = { content: "msg", fields: { redelivered: false } };
  const context = {
    getChannelRef: () => ({ ack, nack }),
    getMessage: () => message,
  } as any;

  const payload = {
    userId: "3f16e44f-69d1-40ed-ae1d-6b4ddf870a26",
    action: "CREATE" as const,
    resource: "booking",
    resourceId: "4c1df7be-e570-48bf-a126-67c90f14ab64",
    ipAddress: "127.0.0.1",
    userAgent: "jest",
    metadata: { source: "spec" },
    oldValue: { status: "PENDING" },
    newValue: { status: "APPROVED" },
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("persists audit logs and acknowledges message", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    createMock.mockResolvedValueOnce({ id: "audit-id" });
    const consumer = new AuditConsumer(db, encryption);

    await consumer.handleAuditLog(payload, context);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: payload.userId,
        action: payload.action,
        resource: payload.resource,
        resourceId: payload.resourceId,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        eAuditMeta: expect.any(Buffer),
        auditMetaIv: expect.any(Buffer),
        auditMetaAuthTag: expect.any(Buffer),
        auditMetaWrappedKey: expect.any(Buffer),
        metadata: payload.metadata,
        oldValue: payload.oldValue,
        newValue: payload.newValue,
        idempotencyKey: expect.any(String),
      },
    });
    expect(ack).toHaveBeenCalledWith(message);
    expect(nack).not.toHaveBeenCalled();
  });

  it("nacks message when persistence fails", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    createMock.mockRejectedValueOnce(new Error("db down"));
    const consumer = new AuditConsumer(db, encryption);

    await consumer.handleAuditLog(payload, context);

    expect(ack).not.toHaveBeenCalled();
    expect(nack).toHaveBeenCalledWith(message, false, true);
  });
});
