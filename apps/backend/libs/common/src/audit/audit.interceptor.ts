import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { AuditService, AuditAction } from './audit.service';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  action: AuditAction;
  resource: string;
  /** Extract resourceId from request params (e.g., 'id' for /users/:id) */
  resourceIdParam?: string;
  /** Extract resourceId from response body field */
  resourceIdField?: string;
}

/**
 * Decorator to mark a route for audit logging
 * @example
 * @Audit({ action: AuditAction.CREATE, resource: 'User', resourceIdField: 'id' })
 * @Post()
 * createUser() {}
 */
export const Audit = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_KEY, metadata);

/**
 * Decorator to skip audit logging for a route
 */
export const SkipAudit = () => SetMetadata(AUDIT_KEY, null);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMetadata =
      this.reflector.getAllAndOverride<AuditMetadata | null>(AUDIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // Skip if explicitly disabled or no metadata
    if (auditMetadata === null) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const user = request['user'] as { sub?: string } | undefined;
    const startTime = Date.now();
    const handlerName = context.getHandler().name;
    const controllerName = context.getClass().name;
    const routePath = this.getRoutePath(request);

    // Auto-detect action from HTTP method if no explicit metadata
    const action = auditMetadata?.action ?? this.inferAction(request.method);
    const resource =
      auditMetadata?.resource ?? this.inferResource(request.path);

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const resourceId = this.extractResourceId(
            auditMetadata,
            request,
            responseBody,
            user?.sub,
          );
          const statusCode = response.statusCode || 200;

          void this.auditService.log({
            userId: user?.sub,
            action,
            resource,
            resourceId,
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
            metadata: {
              requestId: this.getRequestId(request),
              method: request.method,
              path: request.path,
              originalUrl: request.originalUrl,
              routePath,
              statusCode,
              duration: Date.now() - startTime,
              controller: controllerName,
              handler: handlerName,
              queryKeys: this.getObjectKeys(request.query),
              paramKeys: this.getObjectKeys(request.params),
              hasBody: this.hasPayload(request.body),
            },
          });
        },
        error: (error: unknown) => {
          const statusCode =
            this.extractErrorStatusCode(error) ?? response.statusCode ?? 500;

          void this.auditService.log({
            userId: user?.sub,
            action,
            resource,
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
            metadata: {
              requestId: this.getRequestId(request),
              method: request.method,
              path: request.path,
              originalUrl: request.originalUrl,
              routePath,
              statusCode,
              errorName: this.getErrorName(error),
              errorMessage: this.getErrorMessage(error),
              duration: Date.now() - startTime,
              controller: controllerName,
              handler: handlerName,
              queryKeys: this.getObjectKeys(request.query),
              paramKeys: this.getObjectKeys(request.params),
              hasBody: this.hasPayload(request.body),
            },
          });
        },
      }),
    );
  }

  private inferAction(method: string): AuditAction {
    const methodMap: Record<string, AuditAction> = {
      GET: AuditAction.READ,
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };
    return methodMap[method] ?? AuditAction.READ;
  }

  private inferResource(path: string): string {
    // Words that naturally end in 's' and shouldn't be depluralized
    const noDepluralizeWords = new Set([
      'status',
      'address',
      'access',
      'process',
      'class',
      'business',
      'analysis',
    ]);

    // Extract resource from path: /v1/users/123 -> User
    const segments = path.split('/').filter(Boolean);
    const resourceSegment = segments.find(
      (s) => !s.startsWith('v') && !/^\d+$/.test(s) && !this.isUuid(s),
    );
    if (resourceSegment) {
      const lower = resourceSegment.toLowerCase();
      // users -> User, blog-posts -> BlogPost
      const singular = noDepluralizeWords.has(lower)
        ? resourceSegment
        : resourceSegment.replace(/s$/, '');
      return singular
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    }
    return 'Unknown';
  }

  private isUuid(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      str,
    );
  }

  private getValueByPath(value: unknown, path: string): string | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const segments = path.split('.').filter(Boolean);
    if (segments.length === 0) {
      return undefined;
    }

    let current: unknown = value;
    for (const segment of segments) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return this.toNonEmptyString(current);
  }

  private getIdLikeValue(value: unknown): string | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const record = value as Record<string, unknown>;

    const directId = record['id'] ?? record['uuid'];
    const directIdValue = this.toNonEmptyString(directId);
    if (directIdValue) {
      return directIdValue;
    }

    for (const [key, candidate] of Object.entries(record)) {
      if (key.toLowerCase().endsWith('id')) {
        const candidateValue = this.toNonEmptyString(candidate);
        if (candidateValue) {
          return candidateValue;
        }
      }
    }

    return undefined;
  }

  private getNestedIdLikeValue(value: unknown, depth = 0): string | undefined {
    if (!value || depth > 4 || typeof value !== 'object') {
      return undefined;
    }

    const direct = this.getIdLikeValue(value);
    if (direct) {
      return direct;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = this.getNestedIdLikeValue(item, depth + 1);
        if (nested) {
          return nested;
        }
      }
      return undefined;
    }

    const record = value as Record<string, unknown>;

    // Prefer traversing response payload first
    if ('data' in record) {
      const fromData = this.getNestedIdLikeValue(record['data'], depth + 1);
      if (fromData) {
        return fromData;
      }
    }

    for (const nestedValue of Object.values(record)) {
      const nested = this.getNestedIdLikeValue(nestedValue, depth + 1);
      if (nested) {
        return nested;
      }
    }

    return undefined;
  }

  private getIdFromPath(path: string): string | undefined {
    const segments = path.split('/').filter(Boolean);
    return segments.find((segment) => this.isUuid(segment));
  }

  private getRouteParamNames(request: Request): string[] {
    const requestWithRoute = request as Request & {
      route?: { path?: string | string[] };
    };

    const routePath = requestWithRoute.route?.path;
    const routePatterns = Array.isArray(routePath)
      ? routePath
      : routePath
        ? [routePath]
        : [];

    const names: string[] = [];
    for (const pattern of routePatterns) {
      const matches = pattern.matchAll(/:([A-Za-z0-9_]+)/g);
      for (const match of matches) {
        const name = match[1];
        if (name) {
          names.push(name);
        }
      }
    }

    return names;
  }

  private getRouteDeclaredResourceId(request: Request): string | undefined {
    const paramNames = this.getRouteParamNames(request);
    if (paramNames.length === 0) {
      return undefined;
    }

    const normalized = paramNames.map((name) => ({
      raw: name,
      lower: name.toLowerCase(),
    }));

    const exactCandidates = normalized.filter(
      (n) => n.lower === 'id' || n.lower === 'uuid',
    );
    if (exactCandidates.length > 0) {
      const selected = exactCandidates[exactCandidates.length - 1];
      const value = request.params[selected.raw];
      const normalizedValue = Array.isArray(value) ? value[0] : value;
      return this.toNonEmptyString(normalizedValue);
    }

    const idSuffixCandidates = normalized.filter((n) => n.lower.endsWith('id'));
    if (idSuffixCandidates.length > 0) {
      const selected = idSuffixCandidates[idSuffixCandidates.length - 1];
      const value = request.params[selected.raw];
      const normalizedValue = Array.isArray(value) ? value[0] : value;
      return this.toNonEmptyString(normalizedValue);
    }

    const lastDeclaredParam = normalized[normalized.length - 1];
    const fallbackValue = request.params[lastDeclaredParam.raw];
    const normalizedFallback = Array.isArray(fallbackValue)
      ? fallbackValue[0]
      : fallbackValue;
    return this.toNonEmptyString(normalizedFallback);
  }

  private getIdFromRequestCollections(request: Request): string | undefined {
    const fromParams = this.getIdLikeValue(request.params);
    if (fromParams) {
      return fromParams;
    }

    const fromQuery = this.getIdLikeValue(request.query);
    if (fromQuery) {
      return fromQuery;
    }

    const fromBody = this.getIdLikeValue(request.body);
    if (fromBody) {
      return fromBody;
    }

    return undefined;
  }

  private getIdFromResponse(response: unknown): string | undefined {
    const topLevel = this.getIdLikeValue(response);
    if (topLevel) {
      return topLevel;
    }

    if (!response || typeof response !== 'object') {
      return undefined;
    }

    return this.getNestedIdLikeValue(response);
  }

  private extractResourceId(
    metadata: AuditMetadata | undefined,
    request: Request,
    response: unknown,
    userId?: string,
  ): string | undefined {
    if (metadata?.resourceIdParam) {
      const param = request.params[metadata.resourceIdParam];
      return Array.isArray(param) ? param[0] : param;
    }
    if (metadata?.resourceIdField && typeof response === 'object' && response) {
      const resourceId = this.getValueByPath(
        response,
        metadata.resourceIdField,
      );
      if (resourceId) {
        return resourceId;
      }
    }

    // Priority 1: use route-declared param names (e.g., :bookingId)
    const routeDeclaredResourceId = this.getRouteDeclaredResourceId(request);
    if (routeDeclaredResourceId) {
      return routeDeclaredResourceId;
    }

    // Priority 2: explicit UUID segment in URL path
    const pathResourceId = this.getIdFromPath(request.path);
    if (pathResourceId) {
      return pathResourceId;
    }

    // Priority 3: detect IDs from request params/query/body
    const requestResourceId = this.getIdFromRequestCollections(request);
    if (requestResourceId) {
      return requestResourceId;
    }

    // Priority 4: detect IDs from common API response shapes
    const responseResourceId = this.getIdFromResponse(response);
    if (responseResourceId) {
      return responseResourceId;
    }

    // Priority 5: fallback param checks for UUID/slug conventions
    const params = request.params;

    // Explicit 'id' or 'uuid'
    const directId = params['id'] ?? params['uuid'];
    if (directId) {
      return Array.isArray(directId) ? directId[0] : directId;
    }

    // Params ending in 'Id' (gymId, locationId, userId, etc.)
    for (const [key, value] of Object.entries(params)) {
      if (key.endsWith('Id') && value) {
        return Array.isArray(value) ? value[0] : value;
      }
    }

    // Slug-based resources
    const slug = params['slug'];
    if (slug) {
      return Array.isArray(slug) ? slug[0] : slug;
    }

    // Any UUID-like param value
    for (const value of Object.values(params)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v && this.isUuid(v)) {
        return v;
      }
    }

    // Self-access endpoints (e.g., /me, /profile) use userId
    const selfAccessPatterns = ['/me', '/profile', '/account'];
    if (userId && selfAccessPatterns.some((p) => request.path.endsWith(p))) {
      return userId;
    }

    return undefined;
  }

  private toNonEmptyString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }

    return undefined;
  }

  private getRequestId(request: Request): string | undefined {
    const fromHeader = request.headers['x-request-id'];
    if (typeof fromHeader === 'string' && fromHeader.length > 0) {
      return fromHeader;
    }

    const requestWithId = request as Request & { id?: unknown };
    return this.toNonEmptyString(requestWithId.id);
  }

  private getRoutePath(request: Request): string {
    const requestWithRoute = request as Request & {
      route?: { path?: string | string[] };
    };
    const routePath = requestWithRoute.route?.path;

    if (typeof routePath === 'string' && routePath.length > 0) {
      const baseUrl = request.baseUrl || '';
      return `${baseUrl}${routePath}`;
    }

    if (Array.isArray(routePath) && routePath.length > 0) {
      const firstPath = routePath[0];
      if (typeof firstPath === 'string' && firstPath.length > 0) {
        const baseUrl = request.baseUrl || '';
        return `${baseUrl}${firstPath}`;
      }
    }

    return request.path;
  }

  private getObjectKeys(value: unknown): string[] | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return Object.keys(value as Record<string, unknown>).slice(0, 20);
  }

  private hasPayload(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }

    return true;
  }

  private extractErrorStatusCode(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const err = error as Record<string, unknown>;
    const statusCode = err['statusCode'];
    if (typeof statusCode === 'number') {
      return statusCode;
    }

    const status = err['status'];
    return typeof status === 'number' ? status : undefined;
  }

  private getErrorName(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    return this.toNonEmptyString((error as Record<string, unknown>)['name']);
  }

  private getErrorMessage(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const message = this.toNonEmptyString(
      (error as Record<string, unknown>)['message'],
    );

    if (!message) {
      return undefined;
    }

    return message.length > 300 ? `${message.slice(0, 297)}...` : message;
  }
}
