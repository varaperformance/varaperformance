/**
 * Centralised React-Query key factory.
 *
 * Follow the pattern: `domain.all → domain.lists → domain.list(filter) → domain.detail(id)`
 * so invalidating `domain.all` cascades to every related query.
 *
 * Hooks that already define their own key objects (elevate, admin, faqs,
 * notifications, personal-records, spotlight, climb) are not duplicated here.
 */

export const authKeys = {
  me: ['me'] as const,
  registrationAccess: ['registration-access'] as const,
};

export const exerciseKeys = {
  all: ['exercises'] as const,
  list: (filters?: unknown) => ['exercises', filters] as const,
  detail: (slug: string) => ['exercise', slug] as const,
};

export const workoutSessionKeys = {
  all: ['workout-sessions'] as const,
  list: (query?: unknown) => ['workout-sessions', query] as const,
  detail: (id: string) => ['workout-session', id] as const,
  stats: ['workout-stats'] as const,
  frequentExercises: ['frequent-exercises'] as const,
  active: ['active-session'] as const,
};

export const workoutPlanKeys = {
  all: ['workout-plans'] as const,
  list: (query?: unknown) => ['workout-plans', query] as const,
  mine: (query?: unknown) => ['workout-plans', 'me', query] as const,
};

export const waterKeys = {
  summary: (date: string) => ['water-summary', date] as const,
  goal: ['water-goal'] as const,
};

export const weightKeys = {
  all: ['weight-logs'] as const,
  list: (query?: unknown) => ['weight-logs', query] as const,
  detail: (id: string) => ['weight-log', id] as const,
  goal: ['weight-goal'] as const,
};

export const noteKeys = {
  all: ['notes'] as const,
  list: (page: number, limit: number) => ['notes', page, limit] as const,
  detail: (id: string) => ['note', id] as const,
};

export const blogKeys = {
  all: ['blogs'] as const,
  list: (limit: number, offset: number) => ['blogs', limit, offset] as const,
  detail: (slug: string) => ['blog', slug] as const,
};

export const messagingKeys = {
  all: ['conversations'] as const,
  list: (params?: unknown) => ['conversations', params] as const,
  detail: (id: string) => ['conversation', id] as const,
};

export const shopKeys = {
  catalog: (params?: unknown) => ['shop', 'catalog', params] as const,
  product: (id: string) => ['shop', 'product', id] as const,
  promotions: ['shop', 'promotions', 'active'] as const,
  categories: ['shop', 'categories'] as const,
};

export const coachKeys = {
  me: ['coach', 'me'] as const,
  dashboard: ['coach', 'me', 'dashboard'] as const,
  contracts: (params?: unknown) => ['coach', 'contracts', params] as const,
  contract: (id: string) => ['coach', 'contracts', id] as const,
};

export const stravaKeys = {
  status: ['integrations', 'strava', 'status'] as const,
};

export const consentKeys = {
  documents: (types?: unknown) =>
    ['legal-documents', 'active', types ?? []] as const,
  document: (type: string) => ['legal-documents', type] as const,
  check: ['consent', 'check'] as const,
};

export const socialKeys = {
  all: ['socials'] as const,
};

export const lifestyleGoalKeys = {
  goal: ['lifestyle-goal'] as const,
  defaults: ['lifestyle-goal-defaults'] as const,
  insights: ['lifestyle-insights'] as const,
};

export const stackKeys = {
  all: ['stacks'] as const,
  active: ['stacks', 'active'] as const,
  logs: (stackId: string, date: string) =>
    ['stack-logs', stackId, date] as const,
};

export const siteStatsKeys = {
  all: ['site-stats'] as const,
};

export const gymKeys = {
  all: ['gyms'] as const,
  list: (params?: unknown) => ['gyms', params] as const,
  detail: (id: string) => ['gym', id] as const,
};

export const giphyKeys = {
  search: (query: string, limit: number, offset: number, rating: string) =>
    ['giphy', 'search', query, limit, offset, rating] as const,
  trending: (limit: number, offset: number, rating: string) =>
    ['giphy', 'trending', limit, offset, rating] as const,
};

export const recipeKeys = {
  search: (query: unknown) => ['recipes', 'search', query] as const,
  detail: (id: string) => ['recipes', 'detail', id] as const,
};

export const calculatorKeys = {
  prefillWeightLogs: ['calculator-prefill', 'weight-logs'] as const,
};
