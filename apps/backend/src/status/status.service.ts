import { DatabaseService } from '@app/database/database.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  serviceSelect,
  incidentSelect,
  incidentUpdateSelect,
  incidentWithUpdatesSelect,
} from './selectors/status.selector';
import {
  CreateIncidentDto,
  AddIncidentNoteDto,
  CreateServiceDto,
  UpdateIncidentDto,
  PaginationDto,
} from './dto/status.dto';
import {
  SuccessResponse,
  ServiceResponse,
  IncidentResponse,
  IncidentUpdateResponse,
  IncidentsListData,
  IncidentWithUpdates,
  RepoStatus,
  WorkflowStatus,
  SiteStatResponse,
} from '@varaperformance/core';

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion:
    | 'action_required'
    | 'cancelled'
    | 'failure'
    | 'neutral'
    | 'success'
    | 'skipped'
    | 'stale'
    | 'timed_out'
    | null;
  created_at: string;
}

interface GitHubWorkflowRunsResponse {
  total_count: number;
  workflow_runs: GitHubWorkflowRun[];
}

@Injectable()
export class StatusService {
  private readonly githubToken: string;
  private readonly repos = [
    { owner: 'varaperformance', repo: 'varaperformance' },
    { owner: 'varaperformance', repo: 'varaperformance-mobile' },
  ];

  private githubCache: { data: RepoStatus[]; expiresAt: number } | null = null;
  private static readonly GITHUB_CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly prismaService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.githubToken = this.configService.get<string>('GITHUB_TOKEN') ?? '';
  }

  async createService(
    createServiceDto: CreateServiceDto,
  ): Promise<SuccessResponse<ServiceResponse>> {
    const { name, description } = createServiceDto;
    const service = await this.prismaService.service.create({
      data: {
        name,
        description,
      },
      select: serviceSelect,
    });
    return {
      success: true,
      data: this.formatService(service),
    };
  }

  async createIncident(
    createIncidentDto: CreateIncidentDto,
  ): Promise<SuccessResponse<IncidentResponse>> {
    const { title, status } = createIncidentDto;
    const incident = await this.prismaService.incident.create({
      data: {
        title,
        status,
      },
      select: incidentSelect,
    });
    return {
      success: true,
      data: this.formatIncident(incident),
    };
  }

  async updateIncident(
    updateIncidentDto: UpdateIncidentDto,
  ): Promise<SuccessResponse<IncidentResponse>> {
    const { id, title, status } = updateIncidentDto;
    const incident = await this.prismaService.incident.update({
      where: { id },
      data: {
        title,
        status,
      },
      select: incidentSelect,
    });
    return {
      success: true,
      data: this.formatIncident(incident),
    };
  }

  async addIncidentNote(
    addIncidentNoteDto: AddIncidentNoteDto,
  ): Promise<SuccessResponse<IncidentUpdateResponse>> {
    const { incidentId, message } = addIncidentNoteDto;

    // Verify incident exists
    const incident = await this.prismaService.incident.findUnique({
      where: { id: incidentId },
      select: { id: true },
    });

    if (!incident) {
      throw new NotFoundException(`Incident with ID ${incidentId} not found`);
    }

    const incidentUpdate = await this.prismaService.incidentUpdate.create({
      data: {
        incidentId,
        message,
      },
      select: incidentUpdateSelect,
    });
    return {
      success: true,
      data: this.formatIncidentUpdate(incidentUpdate),
    };
  }

  async getServiceStatus(): Promise<SuccessResponse<ServiceResponse[]>> {
    const services = await this.prismaService.service.findMany({
      orderBy: {
        order: 'asc',
      },
      select: serviceSelect,
    });
    return {
      success: true,
      data: services.map((s) => this.formatService(s)),
    };
  }

  async getAllIncidents(
    paginationDto: PaginationDto,
  ): Promise<SuccessResponse<IncidentsListData>> {
    const { limit, offset } = paginationDto;
    const [incidents, total] = await Promise.all([
      this.prismaService.incident.findMany({
        take: limit,
        skip: offset,
        select: incidentWithUpdatesSelect,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prismaService.incident.count(),
    ]);
    return {
      success: true,
      data: {
        incidents: incidents.map((i) => this.formatIncidentWithUpdates(i)),
        total,
        limit,
        offset,
      },
    };
  }

  async getGithubStatus(): Promise<SuccessResponse<RepoStatus[]>> {
    if (this.githubCache && Date.now() < this.githubCache.expiresAt) {
      return { success: true, data: this.githubCache.data };
    }

    const results: RepoStatus[] = await Promise.all(
      this.repos.map(async ({ owner, repo }) => {
        try {
          // Get total commit count by checking Link header
          const countResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
            {
              headers: {
                Authorization: `Bearer ${this.githubToken}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'varaperformance-backend',
              },
            },
          );

          let totalCommits = 0;
          const linkHeader = countResponse.headers.get('Link');
          if (linkHeader) {
            // Parse Link header to get last page number: <...?page=123>; rel="last"
            const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (lastMatch) {
              totalCommits = parseInt(lastMatch[1], 10);
            }
          }
          // If no Link header, we have 1 page or less
          if (totalCommits === 0 && countResponse.ok) {
            const countData = (await countResponse.json()) as GitHubCommit[];
            totalCommits = countData.length;
          }

          // Get the latest 5 commits on the default branch
          const commitsResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`,
            {
              headers: {
                Authorization: `Bearer ${this.githubToken}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'varaperformance-backend',
              },
            },
          );

          if (!commitsResponse.ok) {
            const errorText = await commitsResponse.text();
            return {
              repo,
              state: 'unknown',
              totalCommits: 0,
              commits: [],
              workflows: [],
              error: `Commits API failed: ${commitsResponse.status} - ${errorText}`,
            };
          }

          const commits = (await commitsResponse.json()) as GitHubCommit[];

          if (commits.length === 0) {
            return {
              repo,
              state: 'unknown',
              totalCommits: 0,
              commits: [],
              workflows: [],
              error: 'No commits found in repository',
            };
          }

          // Get latest workflow runs for the repo
          const workflowRunsResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=15`,
            {
              headers: {
                Authorization: `Bearer ${this.githubToken}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'varaperformance-backend',
              },
            },
          );

          let state = 'unknown';
          let workflows: WorkflowStatus[] = [];
          let workflowError: string | undefined;

          if (workflowRunsResponse.ok) {
            const workflowRunsData =
              (await workflowRunsResponse.json()) as GitHubWorkflowRunsResponse;

            if (workflowRunsData.total_count === 0) {
              state = 'no_checks';
            } else {
              // Group by workflow name and get the latest run for each
              const workflowMap = new Map<string, GitHubWorkflowRun>();
              for (const run of workflowRunsData.workflow_runs) {
                if (!workflowMap.has(run.name)) {
                  workflowMap.set(run.name, run);
                }
              }

              // Convert to workflow status array
              workflows = Array.from(workflowMap.values()).map((run) => {
                let workflowState: WorkflowStatus['state'] = 'unknown';
                if (
                  run.status === 'in_progress' ||
                  run.status === 'queued' ||
                  run.status === 'waiting'
                ) {
                  workflowState = 'pending';
                } else if (run.conclusion === 'success') {
                  workflowState = 'success';
                } else if (
                  run.conclusion === 'failure' ||
                  run.conclusion === 'timed_out' ||
                  run.conclusion === 'cancelled'
                ) {
                  workflowState = 'failure';
                }
                return {
                  name: run.name,
                  state: workflowState,
                  conclusion: run.conclusion,
                  sha: run.head_sha.substring(0, 7),
                  updatedAt: run.created_at,
                };
              });

              // Overall state: failure if any failing, pending if any pending, success if all success
              if (workflows.some((w) => w.state === 'failure')) {
                state = 'failure';
              } else if (workflows.some((w) => w.state === 'pending')) {
                state = 'pending';
              } else if (workflows.every((w) => w.state === 'success')) {
                state = 'success';
              } else {
                state = 'unknown';
              }
            }
          } else {
            const errorText = await workflowRunsResponse.text();
            workflowError = `Workflow runs API failed: ${workflowRunsResponse.status} - ${errorText}`;
          }

          return {
            repo,
            state,
            totalCommits,
            commits: commits.map((commit) => ({
              sha: commit.sha.substring(0, 7),
              message: commit.commit?.message?.split('\n')[0] ?? '',
              author: commit.commit?.author?.name ?? '',
              date: commit.commit?.author?.date ?? '',
            })),
            workflows: workflows.sort((a, b) => a.name.localeCompare(b.name)),
            ...(workflowError && { error: workflowError }),
          };
        } catch (err) {
          return {
            repo,
            state: 'error',
            totalCommits: 0,
            commits: [],
            workflows: [],
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      }),
    );

    this.githubCache = {
      data: results,
      expiresAt: Date.now() + StatusService.GITHUB_CACHE_TTL_MS,
    };

    return {
      success: true,
      data: results,
    };
  }

  private formatService(service: {
    id: string;
    name: string;
    description: string;
    status: string;
    uptime: number;
    order: number;
    createdAt: Date;
    updatedAt: Date;
  }): ServiceResponse {
    return {
      ...service,
      status: service.status as ServiceResponse['status'],
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  }

  private formatIncident(incident: {
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): IncidentResponse {
    return {
      ...incident,
      status: incident.status as IncidentResponse['status'],
      createdAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt.toISOString(),
    };
  }

  private formatIncidentUpdate(update: {
    id: string;
    incidentId: string;
    message: string;
    createdAt: Date;
  }): IncidentUpdateResponse {
    return {
      ...update,
      createdAt: update.createdAt.toISOString(),
    };
  }

  private formatIncidentWithUpdates(incident: {
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    updates: {
      id: string;
      incidentId: string;
      message: string;
      createdAt: Date;
    }[];
  }): IncidentWithUpdates {
    return {
      ...this.formatIncident(incident),
      updates: incident.updates.map((u) => this.formatIncidentUpdate(u)),
    };
  }

  async getSiteStats(): Promise<SuccessResponse<SiteStatResponse[]>> {
    const stats = await this.prismaService.siteStat.findMany();
    return {
      success: true,
      data: stats.map((s) => ({
        key: s.key,
        value: s.value,
        updatedAt: s.updatedAt.toISOString(),
      })),
    };
  }
}
