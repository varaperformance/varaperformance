/**
 * Standard success response interface
 * Used in NestJS responses and React query onSuccess handlers
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Paginated response interface
 * Used for list endpoints with pagination
 */
export interface PaginatedResponse<T = unknown> {
  success: true;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Standard error response interface
 * Used in NestJS error responses and React query onError handlers
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Union type for API responses
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Generic message response
 */
export interface MessageData {
  message: string;
}
