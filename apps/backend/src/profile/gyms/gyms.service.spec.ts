import { Test, TestingModule } from '@nestjs/testing';
import { GymsService } from './gyms.service';
import { DatabaseService } from '@app/database';

const now = new Date('2024-01-01T00:00:00.000Z');

const baseGym = {
  id: 'gym-1',
  name: 'Strength House',
  description: null,
  logo: null,
  website: null,
  email: null,
  phone: null,
  createdAt: now,
  updatedAt: now,
};

const baseLocation = {
  id: 'loc-1',
  gymId: 'gym-1',
  name: 'Main',
  address: '123 St',
  city: 'Austin',
  state: 'TX',
  country: 'US',
  zipCode: '73301',
  latitude: null,
  longitude: null,
  phone: null,
  email: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

describe('GymsService', () => {
  let service: GymsService;
  const mockDb = {
    gym: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    gymLocation: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } satisfies {
    gym: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    gymLocation: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockDbService = mockDb as unknown as DatabaseService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymsService,
        { provide: DatabaseService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<GymsService>(GymsService);
  });

  it('creates a gym', async () => {
    mockDb.gym.create.mockResolvedValue({ ...baseGym, locations: [] });

    const result = await service.create({ name: 'Strength House' });

    expect(mockDb.gym.create).toHaveBeenCalled();
    const callArg = mockDb.gym.create.mock.calls[0][0];
    expect(callArg.data).toEqual({ name: 'Strength House' });
    expect(callArg.select).toBeDefined();

    expect(result).toEqual({
      success: true,
      data: {
        id: 'gym-1',
        name: 'Strength House',
        description: null,
        logo: null,
        website: null,
        email: null,
        phone: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        locations: [],
      },
    });
  });

  it('returns gym not found on findOne', async () => {
    mockDb.gym.findUnique.mockResolvedValue(null);

    const result = await service.findOne('missing');

    expect(result).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Gym not found' },
    });
  });

  it('lists gyms with pagination', async () => {
    mockDb.gym.findMany.mockResolvedValue([
      { ...baseGym, _count: { locations: 2 } },
    ]);
    mockDb.gym.count.mockResolvedValue(1);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(mockDb.gym.findMany).toHaveBeenCalled();
    const findManyArg = mockDb.gym.findMany.mock.calls[0][0];
    expect(findManyArg.where).toEqual({});
    expect(findManyArg.orderBy).toEqual({ name: 'asc' });
    expect(findManyArg.skip).toBe(0);
    expect(findManyArg.take).toBe(10);
    expect(findManyArg.select._count).toEqual({ select: { locations: true } });

    expect(result).toEqual({
      success: true,
      data: {
        items: [
          {
            id: 'gym-1',
            name: 'Strength House',
            description: null,
            logo: null,
            website: null,
            email: null,
            phone: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            locations: undefined,
            locationCount: 2,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    });
  });

  it('creates a gym location', async () => {
    mockDb.gym.findUnique.mockResolvedValue(baseGym);
    mockDb.gymLocation.create.mockResolvedValue(baseLocation);

    const result = await service.createLocation('gym-1', {
      address: '123 St',
      city: 'Austin',
      country: 'US',
      state: 'TX',
      zipCode: '73301',
      isActive: true,
    });

    expect(mockDb.gymLocation.create).toHaveBeenCalled();
    const createLocArg = mockDb.gymLocation.create.mock.calls[0][0];
    expect(createLocArg.data).toEqual({
      address: '123 St',
      city: 'Austin',
      country: 'US',
      state: 'TX',
      zipCode: '73301',
      isActive: true,
      gymId: 'gym-1',
    });
    expect(createLocArg.select).toBeDefined();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('loc-1');
    }
  });

  it('returns location not found on updateLocation', async () => {
    mockDb.gymLocation.findFirst.mockResolvedValue(null);

    const result = await service.updateLocation('gym-1', 'loc-x', {});

    expect(result).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Location not found' },
    });
  });
});
