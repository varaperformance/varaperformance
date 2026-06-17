import { z } from 'zod';

export const InjectionRouteSchema = z.enum([
  'SUBCUTANEOUS',
  'INTRAMUSCULAR',
  'INTRAVENOUS',
  'OTHER',
]);

export const InjectionSiteSchema = z.enum([
  'ABDOMEN',
  'THIGH',
  'GLUTE',
  'DELTOID',
  'ARM',
  'OTHER',
]);

export const InjectionProtocolDataSchema = z.object({
  name: z.string().min(1).max(120),
  defaultDose: z.string().min(1).max(40).nullable().optional(),
  unit: z.string().min(1).max(20).nullable().optional(),
  route: InjectionRouteSchema.nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const CreateInjectionProtocolSchema = InjectionProtocolDataSchema;

export const UpdateInjectionProtocolSchema =
  InjectionProtocolDataSchema.partial();

export const CreateInjectionLogSchema = z
  .object({
    protocolId: z.uuid().optional(),
    name: z.string().min(1).max(120).optional(),
    dose: z.string().min(1).max(40).nullable().optional(),
    unit: z.string().min(1).max(20).nullable().optional(),
    route: InjectionRouteSchema.nullable().optional(),
    site: InjectionSiteSchema.nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    loggedAt: z.iso.datetime().optional(),
  })
  .refine((data) => !!data.protocolId || !!data.name, {
    message: 'Either protocolId or name is required',
    path: ['name'],
  });

export const InjectionLogsQuerySchema = z.object({
  protocolId: z.uuid().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const InjectionParamsSchema = z.object({
  id: z.uuid(),
});

export type InjectionRoute = z.infer<typeof InjectionRouteSchema>;
export type InjectionSite = z.infer<typeof InjectionSiteSchema>;
export type InjectionProtocolData = z.infer<typeof InjectionProtocolDataSchema>;
export type CreateInjectionProtocol = z.infer<
  typeof CreateInjectionProtocolSchema
>;
export type UpdateInjectionProtocol = z.infer<
  typeof UpdateInjectionProtocolSchema
>;
export type CreateInjectionLog = z.infer<typeof CreateInjectionLogSchema>;
export type InjectionLogsQuery = z.infer<typeof InjectionLogsQuerySchema>;
export type InjectionParams = z.infer<typeof InjectionParamsSchema>;
