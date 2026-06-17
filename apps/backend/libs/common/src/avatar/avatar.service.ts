import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);

  // Background colors for avatars
  private readonly colors = [
    '#F44336',
    '#E91E63',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#2196F3',
    '#03A9F4',
    '#00BCD4',
    '#009688',
    '#4CAF50',
    '#8BC34A',
    '#CDDC39',
    '#FFC107',
    '#FF9800',
    '#FF5722',
    '#795548',
  ];

  constructor(private readonly storageService: StorageService) {}

  /**
   * Generate an avatar SVG and store it in S3-compatible storage.
   * @param displayName - The display name to generate initials from
   * @param userId - Unique identifier to ensure unique filename
   * @returns S3 key for the stored avatar
   */
  async generateAvatar(displayName: string, userId: string): Promise<string> {
    const initials = this.getInitials(displayName);
    const backgroundColor = this.getColorFromString(displayName);
    const svg = this.createSvg(initials, backgroundColor);

    const filename = `${userId}.svg`;
    const uploaded = await this.storageService.uploadText({
      folder: 'avatars',
      filename,
      contentType: 'image/svg+xml',
      body: svg,
    });

    this.logger.debug(`Generated avatar for user ${userId}: ${filename}`);
    return uploaded.key;
  }

  /**
   * Delete an avatar file
   * @param avatarUrl - The avatar URL to delete
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    if (!avatarUrl) {
      return;
    }

    await this.storageService.deleteByUrl(avatarUrl);
  }

  /**
   * Update avatar with new display name
   */
  async updateAvatar(
    displayName: string,
    userId: string,
    oldAvatarUrl?: string | null,
  ): Promise<string> {
    // Delete old avatar if exists
    if (oldAvatarUrl) {
      await this.deleteAvatar(oldAvatarUrl);
    }

    return this.generateAvatar(displayName, userId);
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      // Single word - take first two characters or just first if single char
      return parts[0].substring(0, 2).toUpperCase();
    }
    // Multiple words - take first char of first two words
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  private getColorFromString(str: string): string {
    // Generate consistent color based on string hash
    const hash = crypto.createHash('md5').update(str).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % this.colors.length;
    return this.colors[index];
  }

  private createSvg(initials: string, backgroundColor: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" fill="${backgroundColor}" rx="50" ry="50"/>
  <text x="50" y="50" font-family="Arial, sans-serif" font-size="40" font-weight="600" fill="white" text-anchor="middle" dominant-baseline="central">${this.escapeXml(initials)}</text>
</svg>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
