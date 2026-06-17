import { z } from 'zod';

// ── Enums ──
export const TeamMemberRoleSchema = z.enum(['CORE', 'AMBASSADOR']);
export const AmbassadorApplicationStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'DENIED',
]);

// ── Ambassador Application ──
export const ApplyAmbassadorSchema = z.object({
  reason: z.string().min(20).max(2000),
  contribution: z.string().min(20).max(2000),
  audience: z.string().min(20).max(2000),
});

// ── Admin: Create / Update Team Member ──
export const CreateTeamMemberSchema = z.object({
  userId: z.uuid(),
  role: TeamMemberRoleSchema,
  title: z.string().min(1).max(200),
  bio: z.string().max(2000).optional(),
  photoUrl: z.url().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
});

export const UpdateTeamMemberSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  bio: z.string().max(2000).optional(),
  photoUrl: z.url().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
});

// ── Types ──
export type TeamMemberRole = z.infer<typeof TeamMemberRoleSchema>;
export type AmbassadorApplicationStatus = z.infer<
  typeof AmbassadorApplicationStatusSchema
>;
export type ApplyAmbassador = z.infer<typeof ApplyAmbassadorSchema>;
export type CreateTeamMember = z.infer<typeof CreateTeamMemberSchema>;
export type UpdateTeamMember = z.infer<typeof UpdateTeamMemberSchema>;
