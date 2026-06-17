import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import type {
  PartialProfile,
  ProfileRecord,
  ProfileResponse,
  ProfileAddress,
  MinimalProfileResponse,
  PublicProfileResponse,
  ProfilePii,
  SuccessResponse,
  ErrorResponse,
  CreateGymFromPlace,
  CreateProfileAddress,
  UpdateProfileAddress,
} from '@varaperformance/core';

@Injectable()
export class ProfileService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Get minimal profile for the current user
   * Returns only: userId, displayName, avatarUrl, coverUrl, allowedAI, completedAt, timezone, unit, theme
   * PII is excluded following data minimization (SOC2, HIPAA)
   */
  async findByUserId(
    userId: string,
  ): Promise<SuccessResponse<MinimalProfileResponse> | ErrorResponse> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      select: {
        userId: true,
        displayName: true,
        isProfilePublic: true,
        avatarUrl: true,
        coverUrl: true,
        allowedAI: true,
        completedAt: true,
        timezone: true,
        theme: true,
        // Need encrypted fields to get unit preference
        eProfile: true,
        profileIv: true,
        profileAuthTag: true,
        profileWrappedKey: true,
      },
    });

    if (!profile) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    // Decrypt PII to get unit preference
    const pii = this.decryptPii(profile);

    return {
      success: true as const,
      data: {
        userId: profile.userId,
        displayName: profile.displayName,
        isProfilePublic: profile.isProfilePublic,
        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,
        allowedAI: profile.allowedAI,
        completedAt: profile.completedAt?.toISOString() ?? null,
        timezone: profile.timezone,
        unit: pii.unit ?? null,
        theme: profile.theme,
      },
    };
  }

  /**
   * Get full profile with PII for the current user
   * Use only when PII is actually needed (profile view/edit)
   */
  async findDetailsByUserId(
    userId: string,
  ): Promise<SuccessResponse<ProfileResponse> | ErrorResponse> {
    const [profile, addresses] = await Promise.all([
      this.db.profile.findUnique({
        where: { userId },
      }),
      this.db.profileAddress.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    if (!profile) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    const pii = this.decryptPii(profile);
    return {
      success: true as const,
      data: this.formatProfileResponse(profile, pii, addresses),
    };
  }

  /**
   * Save profile for the current user (upsert public fields + encrypted PII)
   */
  async upsert(
    userId: string,
    data: PartialProfile,
  ): Promise<SuccessResponse<ProfileResponse> | ErrorResponse> {
    const existingProfile = await this.db.profile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    // Extract PII fields that need encryption
    const {
      firstName,
      lastName,
      dateOfBirth,
      unit,
      height,
      timezone,
      theme,
      allowedAI,
      isProfilePublic,
      socials,
      ...publicFields
    } = data;

    // Build update data for public fields
    const updateData: Record<string, unknown> = {};

    if (publicFields.displayName !== undefined) {
      // Normalize to lowercase for URL-safe slugs
      updateData.displayName = publicFields.displayName.toLowerCase();
    }
    if (publicFields.bio !== undefined) {
      updateData.bio = publicFields.bio;
    }
    if (timezone !== undefined) {
      updateData.timezone = timezone;
    }
    if (theme !== undefined) {
      updateData.theme = theme;
    }
    if (allowedAI !== undefined) {
      updateData.allowedAI = allowedAI;
    }
    if (isProfilePublic !== undefined) {
      updateData.isProfilePublic = isProfilePublic;
    }

    // Handle PII encryption if any PII fields are provided
    if (
      firstName !== undefined ||
      lastName !== undefined ||
      dateOfBirth !== undefined ||
      unit !== undefined ||
      height !== undefined
    ) {
      // Decrypt existing PII to merge with updates
      const existingPii = this.decryptPii(existingProfile);

      const newPii: ProfilePii = {
        firstName: firstName ?? existingPii.firstName,
        lastName: lastName ?? existingPii.lastName,
        dateOfBirth: dateOfBirth ?? existingPii.dateOfBirth,
        unit: unit ?? existingPii.unit,
        height: height ?? existingPii.height,
      };

      const encrypted = this.encryption.encrypt(JSON.stringify(newPii));
      updateData.eProfile = encrypted.encryptedContent;
      updateData.profileIv = encrypted.contentIv;
      updateData.profileAuthTag = encrypted.contentAuthTag;
      updateData.profileWrappedKey = encrypted.wrappedKey;
    }

    // Handle socials if provided
    if (socials) {
      await this.db.socials.upsert({
        where: { profileId: existingProfile.id },
        create: { ...socials, profileId: existingProfile.id },
        update: socials,
      });
    }

    // Update profile
    const profile = await this.db.profile.update({
      where: { userId },
      data: updateData,
    });

    const pii = this.decryptPii(profile);

    const addresses = await this.db.profileAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    return {
      success: true,
      data: this.formatProfileResponse(profile, pii, addresses),
    };
  }

  async findPublicByDisplayName(
    displayName: string,
    viewerUserId?: string,
  ): Promise<SuccessResponse<PublicProfileResponse> | ErrorResponse> {
    const normalizedDisplayName = displayName.trim().toLowerCase();
    const rawIdentifier = displayName.trim();

    const profile = await this.db.profile.findFirst({
      where: {
        OR: [
          {
            displayName: {
              equals: normalizedDisplayName,
              mode: 'insensitive',
            },
          },
          {
            userId: rawIdentifier,
          },
        ],
        deletedAt: null,
        user: {
          deletedAt: null,
          isActive: true,
        },
      },
      include: {
        socials: true,
        gyms: {
          include: {
            locations: {
              take: 1,
            },
          },
        },
      },
    });

    if (!profile) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Profile not found',
        },
      };
    }

    const isOwner = Boolean(viewerUserId) && profile.userId === viewerUserId;

    if (!profile.isProfilePublic && !isOwner) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Profile not found',
        },
      };
    }

    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const [workouts, gymPartners, prsThisYear] = await Promise.all([
      this.db.workoutSession.count({
        where: {
          userId: profile.userId,
        },
      }),
      this.db.gymPartner.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: profile.userId }, { receiverId: profile.userId }],
        },
      }),
      this.db.personalRecord.count({
        where: {
          userId: profile.userId,
          achievedAt: {
            gte: startOfYear,
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        userId: profile.userId,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,
        isProfilePublic: profile.isProfilePublic,
        socials: {
          twitter: profile.socials?.twitter ?? null,
          facebook: profile.socials?.facebook ?? null,
          instagram: profile.socials?.instagram ?? null,
          threads: profile.socials?.threads ?? null,
          linkedin: profile.socials?.linkedin ?? null,
          github: profile.socials?.github ?? null,
        },
        gyms: profile.gyms.map((gym) => ({
          id: gym.id,
          name: gym.name,
          city: gym.locations[0]?.city ?? null,
          state: gym.locations[0]?.state ?? null,
          country: gym.locations[0]?.country ?? null,
        })),
        stats: {
          workouts,
          gymPartners,
          prsThisYear,
        },
      },
    };
  }

  /**
   * Mark profile as completed (profile wizard finished)
   */
  async complete(
    userId: string,
  ): Promise<SuccessResponse<ProfileResponse> | ErrorResponse> {
    const existingProfile = await this.db.profile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    const profile = await this.db.profile.update({
      where: { userId },
      data: { completedAt: new Date() },
    });

    const pii = this.decryptPii(profile);

    const addresses = await this.db.profileAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    return {
      success: true,
      data: this.formatProfileResponse(profile, pii, addresses),
    };
  }

  async listAddresses(
    userId: string,
  ): Promise<SuccessResponse<{ items: ProfileAddress[] }> | ErrorResponse> {
    const profile = await this.db.profile.findUnique({ where: { userId } });

    if (!profile) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    const addresses = await this.db.profileAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    return {
      success: true,
      data: { items: this.toProfileAddresses(addresses) },
    };
  }

  async createAddress(
    userId: string,
    input: CreateProfileAddress,
  ): Promise<SuccessResponse<{ address: ProfileAddress }> | ErrorResponse> {
    const profile = await this.db.profile.findUnique({ where: { userId } });

    if (!profile) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    const shouldSetDefault = Boolean(input.isDefault);
    const normalized = this.normalizeAddressCreateInput(input);
    const encryptedAddress = this.encryptAddress(normalized);

    const address = await this.db.$transaction(async (tx) => {
      if (shouldSetDefault) {
        await tx.profileAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.profileAddress.create({
        data: {
          userId,
          eAddress: encryptedAddress.encryptedContent,
          addressIv: encryptedAddress.contentIv,
          addressAuthTag: encryptedAddress.contentAuthTag,
          addressWrappedKey: encryptedAddress.wrappedKey,
          isDefault: shouldSetDefault,
        },
      });
    });

    const mappedAddress = this.toProfileAddress(address);
    if (!mappedAddress) {
      return {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Failed to decrypt address' },
      };
    }

    return {
      success: true,
      data: { address: mappedAddress },
    };
  }

  async updateAddress(
    userId: string,
    addressId: string,
    input: UpdateProfileAddress,
  ): Promise<SuccessResponse<{ address: ProfileAddress }> | ErrorResponse> {
    const existing = await this.db.profileAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Address not found' },
      };
    }

    const shouldSetDefault = input.isDefault === true;
    const current = this.decryptAddress(existing);
    if (!current) {
      return {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Address data is corrupted' },
      };
    }

    const normalized = this.normalizeAddressInput(input);
    const mergedAddress = {
      ...current,
      ...normalized,
    };
    const encryptedAddress = this.encryptAddress(mergedAddress);

    const address = await this.db.$transaction(async (tx) => {
      if (shouldSetDefault) {
        await tx.profileAddress.updateMany({
          where: { userId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      return tx.profileAddress.update({
        where: { id: addressId },
        data: {
          eAddress: encryptedAddress.encryptedContent,
          addressIv: encryptedAddress.contentIv,
          addressAuthTag: encryptedAddress.contentAuthTag,
          addressWrappedKey: encryptedAddress.wrappedKey,
          ...(input.isDefault !== undefined
            ? { isDefault: input.isDefault }
            : {}),
        },
      });
    });

    const mappedAddress = this.toProfileAddress(address);
    if (!mappedAddress) {
      return {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Failed to decrypt address' },
      };
    }

    return {
      success: true,
      data: { address: mappedAddress },
    };
  }

  async deleteAddress(
    userId: string,
    addressId: string,
  ): Promise<SuccessResponse<{ deleted: boolean }> | ErrorResponse> {
    const existing = await this.db.profileAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Address not found' },
      };
    }

    await this.db.profileAddress.delete({
      where: { id: addressId },
    });

    return {
      success: true,
      data: { deleted: true },
    };
  }

  /**
   * Check if a display name is available (excludes current user's profile)
   */
  async checkDisplayNameAvailability(
    displayName: string,
    userId: string,
  ): Promise<SuccessResponse<{ available: boolean }>> {
    // Use case-insensitive search to handle legacy mixed-case entries
    const existing = await this.db.profile.findFirst({
      where: {
        displayName: {
          equals: displayName,
          mode: 'insensitive',
        },
      },
      select: { userId: true },
    });

    // Available if no profile has this name, or if it belongs to the current user
    const available = !existing || existing.userId === userId;

    return {
      success: true,
      data: { available },
    };
  }

  /**
   * Associate gyms with user profile (creates gyms if they don't exist)
   */
  async associateGyms(
    userId: string,
    places: CreateGymFromPlace[],
  ): Promise<SuccessResponse<{ gymIds: string[] }> | ErrorResponse> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    // Find or create gyms based on mapboxId
    const gymIds: string[] = [];

    for (const place of places) {
      // Try to find existing gym by mapboxId
      let gym = await this.db.gym.findUnique({
        where: { mapboxId: place.mapboxId },
      });

      // Create gym if it doesn't exist
      if (!gym) {
        // Require lat/lng for new gyms
        if (place.latitude === undefined || place.longitude === undefined) {
          return {
            success: false,
            error: {
              code: 'BAD_REQUEST',
              message: `Latitude and longitude are required for new gym: ${place.name}`,
            },
          };
        }

        gym = await this.db.gym.create({
          data: {
            mapboxId: place.mapboxId,
            name: place.name,
            locations: {
              create: {
                address: place.formattedAddress || place.name,
                city: place.city || 'Unknown',
                state: place.state,
                country: place.country || 'Unknown',
                zipCode: place.postalCode,
                latitude: place.latitude,
                longitude: place.longitude,
              },
            },
          },
        });
      }

      gymIds.push(gym.id);
    }

    // Update profile with gym associations (replace existing)
    await this.db.profile.update({
      where: { userId },
      data: {
        gyms: {
          set: gymIds.map((id) => ({ id })),
        },
      },
    });

    return {
      success: true,
      data: { gymIds },
    };
  }

  /**
   * Get gyms associated with user profile
   */
  async getGyms(userId: string): Promise<
    | SuccessResponse<
        {
          id: string;
          mapboxId: string | null;
          name: string;
          location: {
            address: string;
            city: string;
            state: string | null;
            country: string;
          } | null;
        }[]
      >
    | ErrorResponse
  > {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      include: {
        gyms: {
          include: {
            locations: {
              take: 1,
            },
          },
        },
      },
    });

    if (!profile) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    const gyms = profile.gyms.map((gym) => ({
      id: gym.id,
      mapboxId: gym.mapboxId,
      name: gym.name,
      location: gym.locations[0]
        ? {
            address: gym.locations[0].address,
            city: gym.locations[0].city,
            state: gym.locations[0].state,
            country: gym.locations[0].country,
          }
        : null,
    }));

    return {
      success: true,
      data: gyms,
    };
  }

  /**
   * Decrypt PII from profile record
   */
  private decryptPii(
    profile: Pick<
      ProfileRecord,
      'eProfile' | 'profileIv' | 'profileAuthTag' | 'profileWrappedKey'
    >,
  ): ProfilePii {
    if (
      !profile.eProfile ||
      !profile.profileIv ||
      !profile.profileAuthTag ||
      !profile.profileWrappedKey
    ) {
      return {};
    }

    try {
      const decrypted = this.encryption.decrypt({
        encryptedContent: Buffer.from(profile.eProfile),
        contentIv: Buffer.from(profile.profileIv),
        contentAuthTag: Buffer.from(profile.profileAuthTag),
        wrappedKey: Buffer.from(profile.profileWrappedKey),
      });
      return JSON.parse(decrypted.toString());
    } catch {
      return {};
    }
  }

  /**
   * Update avatar URL for the current user
   */
  async updateAvatar(
    userId: string,
    avatarUrl: string,
  ): Promise<SuccessResponse<{ avatarUrl: string }> | ErrorResponse> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    await this.db.profile.update({
      where: { userId },
      data: { avatarUrl },
    });

    return {
      success: true as const,
      data: { avatarUrl },
    };
  }

  /**
   * Update cover photo URL for the current user
   */
  async updateCover(
    userId: string,
    coverUrl: string,
  ): Promise<SuccessResponse<{ coverUrl: string }> | ErrorResponse> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    await this.db.profile.update({
      where: { userId },
      data: { coverUrl },
    });

    return {
      success: true as const,
      data: { coverUrl },
    };
  }

  /**
   * Format profile record for API response
   */
  private formatProfileResponse(
    profile: ProfileRecord,
    pii: ProfilePii,
    addresses: Array<{
      id: string;
      eAddress: Uint8Array;
      addressIv: Uint8Array;
      addressAuthTag: Uint8Array;
      addressWrappedKey: Uint8Array;
      isDefault: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): ProfileResponse {
    return {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.displayName,
      isProfilePublic: profile.isProfilePublic,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      coverUrl: profile.coverUrl,
      allowedAI: profile.allowedAI,
      timezone: profile.timezone,
      theme: profile.theme,
      firstName: pii.firstName ?? null,
      lastName: pii.lastName ?? null,
      dateOfBirth: pii.dateOfBirth ?? null,
      unit: pii.unit ?? null,
      height: pii.height ?? null,
      addresses: this.toProfileAddresses(addresses),
      completedAt: profile.completedAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  private encryptAddress(address: {
    label: string | null;
    recipientName: string;
    phone: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
  }) {
    return this.encryption.encrypt(JSON.stringify(address));
  }

  private decryptAddress(address: {
    eAddress: Uint8Array | null;
    addressIv: Uint8Array | null;
    addressAuthTag: Uint8Array | null;
    addressWrappedKey: Uint8Array | null;
  }) {
    if (
      !address.eAddress ||
      !address.addressIv ||
      !address.addressAuthTag ||
      !address.addressWrappedKey
    ) {
      return null;
    }

    try {
      const decrypted = this.encryption.decrypt({
        encryptedContent: Buffer.from(address.eAddress),
        contentIv: Buffer.from(address.addressIv),
        contentAuthTag: Buffer.from(address.addressAuthTag),
        wrappedKey: Buffer.from(address.addressWrappedKey),
      });
      const parsed = JSON.parse(decrypted.toString()) as {
        label?: unknown;
        recipientName?: unknown;
        phone?: unknown;
        line1?: unknown;
        line2?: unknown;
        city?: unknown;
        state?: unknown;
        postalCode?: unknown;
        country?: unknown;
      };

      if (
        typeof parsed.recipientName !== 'string' ||
        typeof parsed.line1 !== 'string' ||
        typeof parsed.city !== 'string' ||
        typeof parsed.postalCode !== 'string' ||
        typeof parsed.country !== 'string'
      ) {
        return null;
      }

      return {
        label: typeof parsed.label === 'string' ? parsed.label : null,
        recipientName: parsed.recipientName,
        phone: typeof parsed.phone === 'string' ? parsed.phone : null,
        line1: parsed.line1,
        line2: typeof parsed.line2 === 'string' ? parsed.line2 : null,
        city: parsed.city,
        state: typeof parsed.state === 'string' ? parsed.state : null,
        postalCode: parsed.postalCode,
        country: parsed.country,
      };
    } catch {
      return null;
    }
  }

  private normalizeAddressCreateInput(input: CreateProfileAddress) {
    return {
      label: input.label?.trim() || null,
      recipientName: input.recipientName.trim(),
      phone: input.phone?.trim() || null,
      line1: input.line1.trim(),
      line2: input.line2?.trim() || null,
      city: input.city.trim(),
      state: input.state?.trim() || null,
      postalCode: input.postalCode.trim(),
      country: input.country.trim().toUpperCase(),
    };
  }

  private normalizeAddressInput(
    input: Partial<
      Pick<
        ProfileAddress,
        | 'label'
        | 'recipientName'
        | 'phone'
        | 'line1'
        | 'line2'
        | 'city'
        | 'state'
        | 'postalCode'
        | 'country'
      >
    >,
  ) {
    return {
      ...(input.label !== undefined
        ? { label: input.label?.trim() || null }
        : {}),
      ...(input.recipientName !== undefined
        ? { recipientName: input.recipientName.trim() }
        : {}),
      ...(input.phone !== undefined
        ? { phone: input.phone?.trim() || null }
        : {}),
      ...(input.line1 !== undefined ? { line1: input.line1.trim() } : {}),
      ...(input.line2 !== undefined
        ? { line2: input.line2?.trim() || null }
        : {}),
      ...(input.city !== undefined ? { city: input.city.trim() } : {}),
      ...(input.state !== undefined
        ? { state: input.state?.trim() || null }
        : {}),
      ...(input.postalCode !== undefined
        ? { postalCode: input.postalCode.trim() }
        : {}),
      ...(input.country !== undefined
        ? { country: input.country.trim().toUpperCase() }
        : {}),
    };
  }

  private toProfileAddresses(
    addresses: Array<{
      id: string;
      eAddress: Uint8Array;
      addressIv: Uint8Array;
      addressAuthTag: Uint8Array;
      addressWrappedKey: Uint8Array;
      isDefault: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): ProfileAddress[] {
    return addresses
      .map((address) => this.toProfileAddress(address))
      .filter((address): address is ProfileAddress => address !== null);
  }

  private toProfileAddress(address: {
    id: string;
    eAddress: Uint8Array;
    addressIv: Uint8Array;
    addressAuthTag: Uint8Array;
    addressWrappedKey: Uint8Array;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ProfileAddress | null {
    const decrypted = this.decryptAddress(address);
    if (!decrypted) {
      return null;
    }

    return {
      id: address.id,
      label: decrypted.label,
      recipientName: decrypted.recipientName,
      phone: decrypted.phone,
      line1: decrypted.line1,
      line2: decrypted.line2,
      city: decrypted.city,
      state: decrypted.state,
      postalCode: decrypted.postalCode,
      country: decrypted.country,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }
}
