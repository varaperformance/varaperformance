import { z } from 'zod';

// Gym schemas
export const CreateGymSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  logo: z.url().optional(),
  website: z.url().optional(),
  email: z.email().optional(),
  phone: z.string().max(50).optional(),
});

export const UpdateGymSchema = CreateGymSchema.partial();

export const GymParamsSchema = z.object({
  id: z.uuid(),
});

export const GymQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

// GymLocation schemas
export const CreateGymLocationSchema = z.object({
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  country: z.string().min(1).max(100),
  zipCode: z.string().max(20).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().max(50).optional(),
  email: z.email().optional(),
  isActive: z.boolean().default(true),
});

export const UpdateGymLocationSchema = CreateGymLocationSchema.partial();

export const GymLocationParamsSchema = z.object({
  gymId: z.uuid(),
  locationId: z.uuid(),
});

export const GymLocationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  city: z.string().optional(),
  country: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

// Schema for creating a gym from a Mapbox place (used by profile wizard)
export const CreateGymFromPlaceSchema = z.object({
  mapboxId: z.string().min(1).max(500),
  name: z.string().min(1).max(255),
  formattedAddress: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  latitude: z.number().min(-90).max(90).optional(), // Optional - only needed for new gyms
  longitude: z.number().min(-180).max(180).optional(), // Optional - only needed for new gyms
  categories: z.array(z.string()).optional(),
});

// Schema for associating multiple gyms from Radar places
export const AssociateGymsFromPlacesSchema = z.object({
  places: z.array(CreateGymFromPlaceSchema).max(10),
});

// Inferred types
export type CreateGym = z.infer<typeof CreateGymSchema>;
export type UpdateGym = z.infer<typeof UpdateGymSchema>;
export type GymParams = z.infer<typeof GymParamsSchema>;
export type GymQuery = z.infer<typeof GymQuerySchema>;

export type CreateGymLocation = z.infer<typeof CreateGymLocationSchema>;
export type UpdateGymLocation = z.infer<typeof UpdateGymLocationSchema>;
export type GymLocationParams = z.infer<typeof GymLocationParamsSchema>;
export type GymLocationQuery = z.infer<typeof GymLocationQuerySchema>;

export type CreateGymFromPlace = z.infer<typeof CreateGymFromPlaceSchema>;
export type AssociateGymsFromPlaces = z.infer<
  typeof AssociateGymsFromPlacesSchema
>;
