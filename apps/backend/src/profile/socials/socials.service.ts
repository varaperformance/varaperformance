import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type {
  CreateSocials,
  SocialsRecord,
  SocialsResponse,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';

@Injectable()
export class SocialsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get socials for the current user's profile
   */
  async findByUserId(userId: string) {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      include: { socials: true },
    });

    if (!profile) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    return {
      success: true as const,
      data: profile.socials
        ? this.formatSocialsResponse(profile.socials)
        : null,
    };
  }

  /**
   * Save socials for the current user's profile (upsert)
   */
  async upsert(
    userId: string,
    data: CreateSocials,
  ): Promise<SuccessResponse<SocialsResponse> | ErrorResponse> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    const socials = await this.db.socials.upsert({
      where: { profileId: profile.id },
      create: {
        ...data,
        profileId: profile.id,
      },
      update: data,
    });

    return { success: true, data: this.formatSocialsResponse(socials) };
  }

  /**
   * Delete socials for the current user's profile
   */
  async remove(
    userId: string,
  ): Promise<SuccessResponse<{ message: string }> | ErrorResponse> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      include: { socials: true },
    });

    if (!profile) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      };
    }

    if (!profile.socials) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Socials not found' },
      };
    }

    await this.db.socials.delete({ where: { id: profile.socials.id } });

    return { success: true, data: { message: 'Socials deleted successfully' } };
  }

  /**
   * Format socials record for API response
   */
  private formatSocialsResponse(socials: SocialsRecord): SocialsResponse {
    return {
      id: socials.id,
      profileId: socials.profileId,
      twitter: socials.twitter,
      facebook: socials.facebook,
      instagram: socials.instagram,
      threads: socials.threads,
      linkedin: socials.linkedin,
      github: socials.github,
      createdAt: socials.createdAt.toISOString(),
      updatedAt: socials.updatedAt.toISOString(),
    };
  }
}
