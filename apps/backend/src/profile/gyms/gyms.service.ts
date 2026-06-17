import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  gymWithLocationsSelect,
  gymListSelect,
  gymLocationSelect,
} from './selectors/gym.selector';
import type {
  CreateGym,
  UpdateGym,
  GymQuery,
  CreateGymLocation,
  UpdateGymLocation,
  GymLocationQuery,
  GymRecord,
  GymLocationRecord,
  GymResponse,
  GymLocationResponse,
  GymsListData,
  GymLocationsListData,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';

@Injectable()
export class GymsService {
  constructor(private readonly db: DatabaseService) {}

  // ==================== GYM CRUD ====================

  /**
   * Create a new gym
   */
  async create(data: CreateGym): Promise<SuccessResponse<GymResponse>> {
    const gym = await this.db.gym.create({
      data,
      select: gymWithLocationsSelect,
    });

    return { success: true, data: this.formatGymResponse(gym) };
  }

  /**
   * Get all gyms with pagination and optional search
   */
  async findAll(query: GymQuery): Promise<SuccessResponse<GymsListData>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [gyms, total] = await Promise.all([
      this.db.gym.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        select: gymListSelect,
      }),
      this.db.gym.count({ where }),
    ]);

    const items = gyms.map((gym) => ({
      ...this.formatGymResponse(gym),
      locationCount: gym._count.locations,
    }));

    return { success: true, data: { items, total, page, limit } };
  }

  /**
   * Get a single gym by ID with its locations
   */
  async findOne(
    gymId: string,
  ): Promise<SuccessResponse<GymResponse> | ErrorResponse> {
    const gym = await this.db.gym.findUnique({
      where: { id: gymId },
      select: gymWithLocationsSelect,
    });

    if (!gym) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gym not found' },
      };
    }

    return {
      success: true,
      data: {
        ...this.formatGymResponse(gym),
        locations: gym.locations.map((loc) => this.formatLocationResponse(loc)),
      },
    };
  }

  /**
   * Update a gym
   */
  async update(
    gymId: string,
    data: UpdateGym,
  ): Promise<SuccessResponse<GymResponse> | ErrorResponse> {
    const existing = await this.db.gym.findUnique({
      where: { id: gymId },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gym not found' },
      };
    }

    const gym = await this.db.gym.update({
      where: { id: gymId },
      data,
      select: gymWithLocationsSelect,
    });

    return { success: true, data: this.formatGymResponse(gym) };
  }

  /**
   * Delete a gym (cascades to locations)
   */
  async remove(
    gymId: string,
  ): Promise<SuccessResponse<{ message: string }> | ErrorResponse> {
    const existing = await this.db.gym.findUnique({
      where: { id: gymId },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gym not found' },
      };
    }

    await this.db.gym.delete({ where: { id: gymId } });

    return { success: true, data: { message: 'Gym deleted successfully' } };
  }

  // ==================== GYM LOCATION CRUD ====================

  /**
   * Create a new location for a gym
   */
  async createLocation(
    gymId: string,
    data: CreateGymLocation,
  ): Promise<SuccessResponse<GymLocationResponse> | ErrorResponse> {
    const gym = await this.db.gym.findUnique({
      where: { id: gymId },
      select: { id: true },
    });

    if (!gym) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gym not found' },
      };
    }

    const location = await this.db.gymLocation.create({
      data: { ...data, gymId },
      select: gymLocationSelect,
    });

    return { success: true, data: this.formatLocationResponse(location) };
  }

  /**
   * Get all locations for a gym with pagination
   */
  async findAllLocations(
    gymId: string,
    query: GymLocationQuery,
  ): Promise<SuccessResponse<GymLocationsListData> | ErrorResponse> {
    const gym = await this.db.gym.findUnique({
      where: { id: gymId },
      select: { id: true },
    });

    if (!gym) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Gym not found' },
      };
    }

    const { page, limit, city, country, isActive } = query;
    const skip = (page - 1) * limit;

    const where = {
      gymId,
      ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
      ...(country && {
        country: { contains: country, mode: 'insensitive' as const },
      }),
      ...(isActive !== undefined && { isActive }),
    };

    const [locations, total] = await Promise.all([
      this.db.gymLocation.findMany({
        where,
        orderBy: { city: 'asc' },
        skip,
        take: limit,
        select: gymLocationSelect,
      }),
      this.db.gymLocation.count({ where }),
    ]);

    const items = locations.map((loc) => this.formatLocationResponse(loc));

    return { success: true, data: { items, total, page, limit } };
  }

  /**
   * Get a single location by ID
   */
  async findOneLocation(
    gymId: string,
    locationId: string,
  ): Promise<SuccessResponse<GymLocationResponse> | ErrorResponse> {
    const location = await this.db.gymLocation.findFirst({
      where: { id: locationId, gymId },
      select: gymLocationSelect,
    });

    if (!location) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Location not found' },
      };
    }

    return { success: true, data: this.formatLocationResponse(location) };
  }

  /**
   * Update a location
   */
  async updateLocation(
    gymId: string,
    locationId: string,
    data: UpdateGymLocation,
  ): Promise<SuccessResponse<GymLocationResponse> | ErrorResponse> {
    const existing = await this.db.gymLocation.findFirst({
      where: { id: locationId, gymId },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Location not found' },
      };
    }

    const location = await this.db.gymLocation.update({
      where: { id: locationId },
      data,
      select: gymLocationSelect,
    });

    return { success: true, data: this.formatLocationResponse(location) };
  }

  /**
   * Delete a location
   */
  async removeLocation(
    gymId: string,
    locationId: string,
  ): Promise<SuccessResponse<{ message: string }> | ErrorResponse> {
    const existing = await this.db.gymLocation.findFirst({
      where: { id: locationId, gymId },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Location not found' },
      };
    }

    await this.db.gymLocation.delete({ where: { id: locationId } });

    return {
      success: true,
      data: { message: 'Location deleted successfully' },
    };
  }

  // ==================== HELPERS ====================

  private formatGymResponse(gym: GymRecord): GymResponse {
    return {
      id: gym.id,
      name: gym.name,
      description: gym.description,
      logo: gym.logo,
      website: gym.website,
      email: gym.email,
      phone: gym.phone,
      createdAt: gym.createdAt.toISOString(),
      updatedAt: gym.updatedAt.toISOString(),
      locations: gym.locations?.map((loc) => this.formatLocationResponse(loc)),
    };
  }

  private formatLocationResponse(
    location: GymLocationRecord,
  ): GymLocationResponse {
    return {
      id: location.id,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
      zipCode: location.zipCode,
      latitude: location.latitude,
      longitude: location.longitude,
      phone: location.phone,
      email: location.email,
      isActive: location.isActive,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    };
  }
}
