import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require specific permissions for a route.
 * User must have ALL listed permissions (AND logic).
 * Permissions are aggregated from user's roles + direct assignments.
 * Supports wildcards: *:* (all), resource:* (all actions), *:action (action on all resources).
 *
 * Routes without @Permissions() require only authentication.
 * Routes with @Public() skip authentication entirely.
 *
 * @param permissions - One or more "resource:action" strings
 * @example @Permissions('incident:create')
 * @example @Permissions('incident:create', 'incident:update')
 * @example @Permissions('blog:publish')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
