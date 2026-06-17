import { Test, TestingModule } from '@nestjs/testing';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

describe('NotesController', () => {
  let controller: NotesController;
  const notesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as const;

  const user = { sub: 'user-1' } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [{ provide: NotesService, useValue: notesService }],
    }).compile();

    controller = module.get<NotesController>(NotesController);
  });

  it('delegates create to service with user', async () => {
    const dto = { title: 'Note' } as any;
    notesService.create.mockResolvedValue({ success: true });

    const result = await controller.create(dto, user);

    expect(result).toEqual({ success: true });
    expect(notesService.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('delegates findAll to service', async () => {
    const query = { page: 1, limit: 10 } as any;
    notesService.findAll.mockResolvedValue({ success: true });

    await controller.findAll(query, user);

    expect(notesService.findAll).toHaveBeenCalledWith('user-1', query);
  });

  it('delegates findOne to service', async () => {
    notesService.findOne.mockResolvedValue({ success: true });

    await controller.findOne({ id: 'n1' } as any, user);

    expect(notesService.findOne).toHaveBeenCalledWith('user-1', 'n1');
  });

  it('delegates update to service', async () => {
    const dto = { title: 'Updated' } as any;
    notesService.update.mockResolvedValue({ success: true });

    await controller.update({ id: 'n1' } as any, dto, user);

    expect(notesService.update).toHaveBeenCalledWith('user-1', 'n1', dto);
  });

  it('delegates remove to service', async () => {
    notesService.remove.mockResolvedValue({ success: true });

    await controller.remove({ id: 'n1' } as any, user);

    expect(notesService.remove).toHaveBeenCalledWith('user-1', 'n1');
  });
});
