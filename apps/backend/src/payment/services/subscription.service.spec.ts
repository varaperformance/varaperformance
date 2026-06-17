import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { DatabaseService } from '@app/database';
import { StripeService } from './stripe.service';
import { NotificationService } from '../../notification/notification.service';

describe('SubscriptionService – IDOR protection', () => {
  let service: SubscriptionService;
  let db: { subscription: { findUnique: jest.Mock } };

  const OWNER_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const ATTACKER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const SUBSCRIPTION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  beforeEach(async () => {
    db = {
      subscription: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: DatabaseService, useValue: db },
        {
          provide: StripeService,
          useValue: { isConfigured: () => false, getClient: () => ({}) },
        },
        {
          provide: NotificationService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(SubscriptionService);
  });

  function mockSubscriptionOwnedBy(userId: string) {
    db.subscription.findUnique.mockResolvedValue({
      id: SUBSCRIPTION_ID,
      booking: { userId },
    });
  }

  describe('pauseSubscription', () => {
    it('should return FORBIDDEN when called by a different user', async () => {
      mockSubscriptionOwnedBy(OWNER_USER_ID);

      const result = await service.pauseSubscription(
        SUBSCRIPTION_ID,
        ATTACKER_USER_ID,
      );

      expect(result).toEqual({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this subscription',
        },
      });
    });
  });

  describe('resumeSubscription', () => {
    it('should return FORBIDDEN when called by a different user', async () => {
      mockSubscriptionOwnedBy(OWNER_USER_ID);

      const result = await service.resumeSubscription(
        SUBSCRIPTION_ID,
        ATTACKER_USER_ID,
      );

      expect(result).toEqual({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this subscription',
        },
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should return FORBIDDEN when called by a different user', async () => {
      mockSubscriptionOwnedBy(OWNER_USER_ID);

      const result = await service.cancelSubscription(
        SUBSCRIPTION_ID,
        ATTACKER_USER_ID,
      );

      expect(result).toEqual({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this subscription',
        },
      });
    });

    it('should return NOT_FOUND for non-existent subscription', async () => {
      db.subscription.findUnique.mockResolvedValue(null);

      const result = await service.cancelSubscription(
        SUBSCRIPTION_ID,
        ATTACKER_USER_ID,
      );

      expect(result).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        },
      });
    });
  });
});
