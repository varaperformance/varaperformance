import { z } from 'zod';

// SOC2/HIPAA: Audit action types matching Prisma enum
export const AuditActionSchema = z.enum([
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'FAILED_LOGIN',
  'PASSWORD_CHANGE',
  'EXPORT',
  'CONSENT_GRANTED',
  'CONSENT_REVOKED',
  'DATA_IMPORT',
]);

// SOC2/HIPAA: Audit log entry schema
export const AuditLogSchema = z.object({
  id: z.uuid().optional(),
  userId: z.uuid().nullable().optional(),
  action: AuditActionSchema,
  resource: z.string().min(1),
  resourceId: z.uuid().nullable().optional(),
  ipAddress: z.string().nullable().optional(), // @encrypted - PII
  userAgent: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  oldValue: z.record(z.string(), z.unknown()).nullable().optional(),
  newValue: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.iso.datetime().optional(),
});

export const CreateAuditLogSchema = AuditLogSchema.omit({
  id: true,
  createdAt: true,
});

// RabbitMQ message schema for the audit.log queue
export const AuditLogMessageSchema = z.object({
  userId: z.string().optional(),
  action: AuditActionSchema,
  resource: z.string().min(1),
  resourceId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  oldValue: z.record(z.string(), z.unknown()).optional(),
  newValue: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string(),
  idempotencyKey: z.string().optional(),
});

export type AuditLogMessage = z.infer<typeof AuditLogMessageSchema>;

// SOC2: Session schema for session tracking
export const SessionSchema = z.object({
  id: z.uuid().optional(),
  userId: z.uuid(),
  token: z.string().min(1),
  ipAddress: z.string().nullable().optional(), // @encrypted
  userAgent: z.string().nullable().optional(),
  lastActivity: z.iso.datetime().optional(),
  expiresAt: z.iso.datetime(),
  isRevoked: z.boolean().default(false),
  createdAt: z.iso.datetime().optional(),
});

export const CreateSessionSchema = SessionSchema.omit({
  id: true,
  lastActivity: true,
  createdAt: true,
});

// SOC2: Login attempt schema for brute force tracking
export const LoginAttemptSchema = z.object({
  id: z.uuid().optional(),
  email: z.email(), // @encrypted - PII
  ipAddress: z.string().nullable().optional(), // @encrypted
  success: z.boolean(),
  reason: z.string().nullable().optional(),
  createdAt: z.iso.datetime().optional(),
});

export const CreateLoginAttemptSchema = LoginAttemptSchema.omit({
  id: true,
  createdAt: true,
});

// SOC2: Data retention tracking
export const DataRetentionSchema = z.object({
  id: z.uuid().optional(),
  resource: z.string().min(1),
  resourceId: z.uuid(),
  retainUntil: z.iso.datetime(),
  legalHold: z.boolean().default(false),
  deletedAt: z.iso.datetime().nullable().optional(),
  deletedBy: z.uuid().nullable().optional(),
  retentionNotes: z.string().nullable().optional(),
  createdAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime().optional(),
});

// Inferred types
export type AuditAction = z.infer<typeof AuditActionSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type CreateSession = z.infer<typeof CreateSessionSchema>;
export type LoginAttempt = z.infer<typeof LoginAttemptSchema>;
export type CreateLoginAttempt = z.infer<typeof CreateLoginAttemptSchema>;
export type DataRetention = z.infer<typeof DataRetentionSchema>;
