import { Test, TestingModule } from '@nestjs/testing';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';

describe('StatusController', () => {
  let controller: StatusController;
  const statusService = {
    createService: jest.fn(),
    createIncident: jest.fn(),
    updateIncident: jest.fn(),
    addIncidentNote: jest.fn(),
    getServiceStatus: jest.fn(),
    getAllIncidents: jest.fn(),
    getGithubStatus: jest.fn(),
  } as const;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatusController],
      providers: [{ provide: StatusService, useValue: statusService }],
    }).compile();

    controller = module.get<StatusController>(StatusController);
  });

  it('creates service', async () => {
    statusService.createService.mockResolvedValue({ success: true });
    const dto = { name: 'API', description: 'd' } as any;

    await controller.createService(dto);

    expect(statusService.createService).toHaveBeenCalledWith(dto);
  });

  it('creates incident', async () => {
    statusService.createIncident.mockResolvedValue({ success: true });
    const dto = { title: 'Outage', status: 'INVESTIGATING' } as any;

    await controller.createIncident(dto);

    expect(statusService.createIncident).toHaveBeenCalledWith(dto);
  });

  it('updates incident', async () => {
    statusService.updateIncident.mockResolvedValue({ success: true });
    const dto = { id: 'i1', status: 'RESOLVED' } as any;

    await controller.updateIncident(dto);

    expect(statusService.updateIncident).toHaveBeenCalledWith(dto);
  });

  it('adds incident note', async () => {
    statusService.addIncidentNote.mockResolvedValue({ success: true });
    const dto = { incidentId: 'i1', message: 'm' } as any;

    await controller.addIncidentNote(dto);

    expect(statusService.addIncidentNote).toHaveBeenCalledWith(dto);
  });

  it('gets service status', async () => {
    statusService.getServiceStatus.mockResolvedValue({ success: true });

    await controller.getAllServices();

    expect(statusService.getServiceStatus).toHaveBeenCalled();
  });

  it('gets incidents with pagination', async () => {
    statusService.getAllIncidents.mockResolvedValue({ success: true });
    const dto = { limit: 10, offset: 0 } as any;

    await controller.getAllIncidents(dto);

    expect(statusService.getAllIncidents).toHaveBeenCalledWith(dto);
  });

  it('gets GitHub status', async () => {
    statusService.getGithubStatus.mockResolvedValue({ success: true });

    await controller.getGithubStatus();

    expect(statusService.getGithubStatus).toHaveBeenCalled();
  });
});
