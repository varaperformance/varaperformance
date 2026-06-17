import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { DASHBOARD_CARD_IDS } from '@varaperformance/core';
import type {
  UpdateDashboardPreference,
  SuccessResponse,
} from '@varaperformance/core';

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getPreferences(userId: string): Promise<SuccessResponse> {
    const pref = await this.db.dashboardPreference.findUnique({
      where: { userId },
      select: { visibleCards: true, cardOrder: true, cardSizes: true },
    });

    const defaults = {
      visibleCards: [...DASHBOARD_CARD_IDS],
      cardOrder: [...DASHBOARD_CARD_IDS],
      cardSizes: null,
    };

    return {
      success: true,
      data: pref ?? defaults,
    };
  }

  async updatePreferences(
    userId: string,
    dto: UpdateDashboardPreference,
  ): Promise<SuccessResponse> {
    const pref = await this.db.dashboardPreference.upsert({
      where: { userId },
      create: {
        userId,
        visibleCards: dto.visibleCards,
        cardOrder: dto.cardOrder,
        cardSizes: dto.cardSizes ?? undefined,
      },
      update: {
        visibleCards: dto.visibleCards,
        cardOrder: dto.cardOrder,
        ...(dto.cardSizes !== undefined && { cardSizes: dto.cardSizes }),
      },
      select: { visibleCards: true, cardOrder: true, cardSizes: true },
    });

    return {
      success: true,
      data: pref,
    };
  }
}
