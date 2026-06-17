/**
 * Service status enum values
 */
export type ServiceStatusType =
  | 'OPERATIONAL'
  | 'DEGRADED'
  | 'OUTAGE'
  | 'MAINTENANCE';

/**
 * Incident status enum values
 */
export type IncidentStatusType =
  | 'INVESTIGATING'
  | 'IDENTIFIED'
  | 'MONITORING'
  | 'RESOLVED';

/**
 * Service response
 */
export interface ServiceResponse {
  id: string;
  name: string;
  description: string;
  status: ServiceStatusType;
  uptime: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Incident update/note
 */
export interface IncidentUpdateResponse {
  id: string;
  incidentId: string;
  message: string;
  createdAt: string;
}

/**
 * Incident response
 */
export interface IncidentResponse {
  id: string;
  title: string;
  status: IncidentStatusType;
  createdAt: string;
  updatedAt: string;
}

/**
 * Incident with updates
 */
export interface IncidentWithUpdates extends IncidentResponse {
  updates: IncidentUpdateResponse[];
}

/**
 * Paginated incidents list response
 */
export interface IncidentsListData {
  incidents: IncidentWithUpdates[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * GitHub workflow status
 */
export interface WorkflowStatus {
  name: string;
  state: 'success' | 'failure' | 'pending' | 'unknown';
  conclusion: string | null;
  sha: string;
  updatedAt: string;
}

/**
 * GitHub commit info
 */
export interface GitHubCommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
}

/**
 * Repository status
 */
export interface RepoStatus {
  repo: string;
  state: string;
  totalCommits: number;
  commits: GitHubCommitInfo[];
  workflows: WorkflowStatus[];
  error?: string;
}

/**
 * Site stat key-value pair
 */
export interface SiteStatResponse {
  key: string;
  value: string;
  updatedAt: string;
}
