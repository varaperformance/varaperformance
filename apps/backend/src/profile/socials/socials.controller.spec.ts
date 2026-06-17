import { Test, TestingModule } from '@nestjs/testing';
import { SocialsController } from './socials.controller';
import { SocialsService } from './socials.service';

describe('SocialsController', () => {
  let controller: SocialsController;

  const mockService = {
    findByUserId: jest.fn(),
    upsert: jest.fn(),
    remove: jest.fn(),
  } satisfies Record<string, jest.Mock>;

  const mockUser = { sub: 'user-1', email: 'test@example.com' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SocialsController],
      providers: [{ provide: SocialsService, useValue: mockService }],
    }).compile();

    controller = module.get<SocialsController>(SocialsController);
  });

  it('delegates findOne', async () => {
    mockService.findByUserId.mockResolvedValue('socials');

    const result = await controller.findOne(mockUser);

    expect(mockService.findByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toBe('socials');
  });

  it('delegates save (upsert)', async () => {
    mockService.upsert.mockResolvedValue('saved');

    const result = await controller.save(
      { twitter: 'https://twitter.com/test' } as any,
      mockUser,
    );

    expect(mockService.upsert).toHaveBeenCalledWith('user-1', {
      twitter: 'https://twitter.com/test',
    });
    expect(result).toBe('saved');
  });

  it('delegates remove', async () => {
    mockService.remove.mockResolvedValue('removed');

    const result = await controller.remove(mockUser);

    expect(mockService.remove).toHaveBeenCalledWith('user-1');
    expect(result).toBe('removed');
  });
});
