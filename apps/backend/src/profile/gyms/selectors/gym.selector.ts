/**
 * Prisma select for gym - excludes relation counts
 */
export const gymSelect = {
  id: true,
  mapboxId: true,
  name: true,
  description: true,
  logo: true,
  website: true,
  email: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
};
export type GymSelect = typeof gymSelect;

// Gym location selector
export const gymLocationSelect = {
  id: true,
  gymId: true,
  address: true,
  city: true,
  state: true,
  country: true,
  zipCode: true,
  latitude: true,
  longitude: true,
  phone: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};
export type GymLocationSelect = typeof gymLocationSelect;

/**
 * Prisma select for gym with locations
 */
export const gymWithLocationsSelect = {
  ...gymSelect,
  locations: { select: gymLocationSelect },
};
export type GymWithLocationsSelect = typeof gymWithLocationsSelect;

/**
 * Prisma select for gym list (includes location count)
 */
export const gymListSelect = {
  ...gymSelect,
  _count: {
    select: { locations: true },
  },
};
export type GymListSelect = typeof gymListSelect;
