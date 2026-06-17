import { ConfigService } from '@nestjs/config';
import { StatusService } from './status.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  service: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  incident: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  incidentUpdate: {
    create: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn().mockReturnValue('token'),
};

describe('StatusService', () => {
  let service: StatusService;
  const now = new Date();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StatusService(
      mockPrisma as any,
      mockConfig as unknown as ConfigService,
    );
  });

  it('creates a service and formats dates', async () => {
    mockPrisma.service.create.mockResolvedValue({
      id: 's1',
      name: 'API',
      description: 'desc',
      status: 'OPERATIONAL',
      uptime: 99,
      order: 1,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.createService({
      name: 'API',
      description: 'd',
    });

    expect(result.success).toBe(true);
    expect(result.data.createdAt).toBe(now.toISOString());
    expect(mockPrisma.service.create).toHaveBeenCalled();
    const callArg = mockPrisma.service.create.mock.calls[0][0];
    expect(callArg.data).toEqual({ name: 'API', description: 'd' });
    expect(callArg.select).toBeDefined();
  });

  it('creates and updates incidents', async () => {
    mockPrisma.incident.create.mockResolvedValue({
      id: 'i1',
      title: 'Outage',
      status: 'INVESTIGATING',
      createdAt: now,
      updatedAt: now,
    });
    const created = await service.createIncident({
      title: 'Outage',
      status: 'INVESTIGATING',
    });
    expect(created.data.status).toBe('INVESTIGATING');

    mockPrisma.incident.update.mockResolvedValue({
      id: 'i1',
      title: 'Resolved',
      status: 'RESOLVED',
      createdAt: now,
      updatedAt: now,
    });
    const updated = await service.updateIncident({
      id: 'i1',
      title: 'Resolved',
      status: 'RESOLVED',
    });
    expect(updated.data.status).toBe('RESOLVED');
  });

  it('throws when adding note to missing incident', async () => {
    mockPrisma.incident.findUnique.mockResolvedValue(null);

    await expect(
      service.addIncidentNote({ incidentId: 'missing', message: 'msg' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('adds incident note when incident exists', async () => {
    mockPrisma.incident.findUnique.mockResolvedValue({ id: 'i1' });
    mockPrisma.incidentUpdate.create.mockResolvedValue({
      id: 'u1',
      incidentId: 'i1',
      message: 'msg',
      createdAt: now,
    });

    const result = await service.addIncidentNote({
      incidentId: 'i1',
      message: 'msg',
    });

    expect(result.data).toMatchObject({ incidentId: 'i1', message: 'msg' });
    expect(result.data.createdAt).toBe(now.toISOString());
  });

  it('returns ordered service status list', async () => {
    mockPrisma.service.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'API',
        description: 'd',
        status: 'OPERATIONAL',
        uptime: 99,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await service.getServiceStatus();

    expect(result.data[0].createdAt).toBe(now.toISOString());
    expect(mockPrisma.service.findMany).toHaveBeenCalled();
  });

  it('returns incidents with updates and pagination metadata', async () => {
    mockPrisma.incident.findMany.mockResolvedValue([
      {
        id: 'i1',
        title: 'Outage',
        status: 'INVESTIGATING',
        createdAt: now,
        updatedAt: now,
        updates: [
          {
            id: 'u1',
            incidentId: 'i1',
            message: 'msg',
            createdAt: now,
          },
        ],
      },
    ]);
    mockPrisma.incident.count.mockResolvedValue(1);

    const result = await service.getAllIncidents({ limit: 10, offset: 0 });

    expect(result.data.total).toBe(1);
    expect(result.data.incidents[0].updates[0].createdAt).toBe(
      now.toISOString(),
    );
  });

  it('fetches GitHub status for configured repos', async () => {
    const originalFetch = global.fetch;
    const headers = { get: jest.fn(() => '<page=2>; rel="last"') } as any;
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers,
        json: () =>
          Promise.resolve([
            {
              sha: 'abc1234',
              commit: {
                message: 'm',
                author: { name: 'a', date: '2024-01-01' },
              },
            },
          ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              sha: 'abcdefg',
              commit: {
                message: 'Commit message',
                author: { name: 'dev', date: '2024-01-02' },
              },
            },
          ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            total_count: 1,
            workflow_runs: [
              {
                id: 1,
                name: 'CI',
                head_sha: 'abcdefg',
                status: 'completed',
                conclusion: 'success',
                created_at: '2024-01-03',
              },
            ],
          }),
      });

    (service as any).repos = [{ owner: 'o', repo: 'r' }];

    const result = await service.getGithubStatus();

    expect(result.success).toBe(true);
    expect(result.data[0].repo).toBe('r');
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(3);
    global.fetch = originalFetch;
  });
});
