/**
 * Gym database record (matches Prisma model)
 */
export interface GymRecord {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  locations?: Array<{
    id: string;
    address: string;
    city: string;
    state: string | null;
    country: string;
    zipCode: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

/**
 * Gym location database record (matches Prisma model)
 */
export interface GymLocationRecord {
  id: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Gym location response returned from API
 */
export interface GymLocationResponse {
  id: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Gym response returned from API
 */
export interface GymResponse {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  locations?: Array<{
    id: string;
    address: string;
    city: string;
    state: string | null;
    country: string;
    zipCode: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  locationCount?: number;
}

/**
 * Paginated gyms list response
 */
export interface GymsListData {
  items: GymResponse[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Paginated gym locations list response
 */
export interface GymLocationsListData {
  items: GymLocationResponse[];
  total: number;
  page: number;
  limit: number;
}
