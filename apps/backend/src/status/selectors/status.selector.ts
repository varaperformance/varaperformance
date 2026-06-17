/**
 * Prisma select for service
 */
export const serviceSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  uptime: true,
  order: true,
  createdAt: true,
  updatedAt: true,
};
export type ServiceSelect = typeof serviceSelect;

/**
 * Prisma select for incident
 */
export const incidentSelect = {
  id: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};
export type IncidentSelect = typeof incidentSelect;

/**
 * Prisma select for incident update
 */
export const incidentUpdateSelect = {
  id: true,
  incidentId: true,
  message: true,
  createdAt: true,
};
export type IncidentUpdateSelect = typeof incidentUpdateSelect;

/**
 * Prisma select for incident with updates
 */
export const incidentWithUpdatesSelect = {
  ...incidentSelect,
  updates: {
    select: incidentUpdateSelect,
  },
};
export type IncidentWithUpdatesSelect = typeof incidentWithUpdatesSelect;
