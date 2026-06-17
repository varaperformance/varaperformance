import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { StorageService } from '@app/common/storage';

describe('ProfileController', () => {
  let controller: ProfileController;

  const mockService = {
    findByUserId: jest.fn(),
    upsert: jest.fn(),
    complete: jest.fn(),
    checkDisplayNameAvailability: jest.fn(),
  } satisfies Record<string, jest.Mock>;

  const mockUser = { sub: 'user-1', email: 'test@example.com' };
  const mockStorageService = {
    uploadBuffer: jest.fn(),
  } satisfies Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        { provide: ProfileService, useValue: mockService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  it('delegates findOne', async () => {
    mockService.findByUserId.mockResolvedValue('profile');

    const result = await controller.findOne(mockUser);

    expect(mockService.findByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toBe('profile');
  });

  it('delegates save (upsert)', async () => {
    mockService.upsert.mockResolvedValue('saved');

    const result = await controller.save(
      { displayName: 'NewName', bio: 'My bio' } as any,
      mockUser,
    );

    expect(mockService.upsert).toHaveBeenCalledWith('user-1', {
      displayName: 'NewName',
      bio: 'My bio',
    });
    expect(result).toBe('saved');
  });

  it('delegates complete', async () => {
    mockService.complete.mockResolvedValue('completed');

    const result = await controller.complete(mockUser);

    expect(mockService.complete).toHaveBeenCalledWith('user-1');
    expect(result).toBe('completed');
  });

  it('delegates checkDisplayName', async () => {
    mockService.checkDisplayNameAvailability.mockResolvedValue({
      success: true,
      data: { available: true },
    });

    const result = await controller.checkDisplayName(
      { displayName: 'TestName' },
      mockUser,
    );

    expect(mockService.checkDisplayNameAvailability).toHaveBeenCalledWith(
      'TestName',
      'user-1',
    );
    expect(result).toEqual({ success: true, data: { available: true } });
  });
});
