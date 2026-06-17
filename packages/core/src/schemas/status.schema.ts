import { z } from 'zod';

// Enums
export const ServiceStatusSchema = z.enum([
  'OPERATIONAL',
  'DEGRADED',
  'OUTAGE',
  'MAINTENANCE',
]);

export const IncidentStatusSchema = z.enum([
  'INVESTIGATING',
  'IDENTIFIED',
  'MONITORING',
  'RESOLVED',
]);

// Service schemas
export const ServiceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  status: ServiceStatusSchema,
  uptime: z.number().min(0).max(100),
  order: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const CreateServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  status: ServiceStatusSchema.optional(),
  uptime: z.number().min(0).max(100).optional(),
  order: z.number().int().optional(),
});

export const UpdateServiceSchema = CreateServiceSchema.partial();

// Incident schemas
export const IncidentSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  status: IncidentStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const CreateIncidentSchema = z.object({
  title: z.string().min(1),
  status: IncidentStatusSchema,
});

export const UpdateIncidentSchema = CreateIncidentSchema.partial().extend({
  id: z.uuid(),
});

// IncidentNote schemas (timeline updates for incidents)
export const IncidentNoteSchema = z.object({
  id: z.uuid(),
  incidentId: z.uuid(),
  message: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export const AddIncidentNoteSchema = z.object({
  incidentId: z.uuid(),
  message: z.string().min(1),
});

// Incident with notes (for API responses)
export const IncidentWithNotesSchema = IncidentSchema.extend({
  updates: z.array(IncidentNoteSchema),
});

// Inferred types
export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type CreateService = z.infer<typeof CreateServiceSchema>;
export type UpdateService = z.infer<typeof UpdateServiceSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type CreateIncident = z.infer<typeof CreateIncidentSchema>;
export type UpdateIncident = z.infer<typeof UpdateIncidentSchema>;
export type IncidentNote = z.infer<typeof IncidentNoteSchema>;
export type AddIncidentNote = z.infer<typeof AddIncidentNoteSchema>;
export type IncidentWithNotes = z.infer<typeof IncidentWithNotesSchema>;
