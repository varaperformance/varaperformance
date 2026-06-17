import { Test, TestingModule } from '@nestjs/testing';
import { GymsController } from './gyms.controller';
import { GymsService } from './gyms.service';

describe('GymsController', () => {
  let controller: GymsController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createLocation: jest.fn(),
    findAllLocations: jest.fn(),
    findOneLocation: jest.fn(),
    updateLocation: jest.fn(),
    removeLocation: jest.fn(),
  } satisfies Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GymsController],
      providers: [{ provide: GymsService, useValue: mockService }],
    }).compile();

    controller = module.get<GymsController>(GymsController);
  });

  it('delegates create', async () => {
    mockService.create.mockResolvedValue('created');

    const result = await controller.create({ name: 'Gym' } as any);

    expect(mockService.create).toHaveBeenCalledWith({ name: 'Gym' });
    expect(result).toBe('created');
  });

  it('delegates findAll', async () => {
    mockService.findAll.mockResolvedValue('list');

    const result = await controller.findAll({ page: 1, limit: 10 } as any);

    expect(mockService.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result).toBe('list');
  });

  it('delegates nested location routes', async () => {
    mockService.createLocation.mockResolvedValue('loc-created');
    mockService.findAllLocations.mockResolvedValue('loc-list');
    mockService.findOneLocation.mockResolvedValue('loc-one');
    mockService.updateLocation.mockResolvedValue('loc-updated');
    mockService.removeLocation.mockResolvedValue('loc-removed');

    await controller.createLocation('gym-1', { name: 'Main' } as any);
    await controller.findAllLocations('gym-1', { page: 1, limit: 5 } as any);
    await controller.findOneLocation({ gymId: 'gym-1', locationId: 'loc-1' });
    await controller.updateLocation({ gymId: 'gym-1', locationId: 'loc-1' }, {
      name: 'Updated',
    } as any);
    await controller.removeLocation({ gymId: 'gym-1', locationId: 'loc-1' });

    expect(mockService.createLocation).toHaveBeenCalledWith('gym-1', {
      name: 'Main',
    });
    expect(mockService.findAllLocations).toHaveBeenCalledWith('gym-1', {
      page: 1,
      limit: 5,
    });
    expect(mockService.findOneLocation).toHaveBeenCalledWith('gym-1', 'loc-1');
    expect(mockService.updateLocation).toHaveBeenCalledWith('gym-1', 'loc-1', {
      name: 'Updated',
    });
    expect(mockService.removeLocation).toHaveBeenCalledWith('gym-1', 'loc-1');
  });
});
