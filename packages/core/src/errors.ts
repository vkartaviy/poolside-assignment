/**
 * Error Types
 */

import type { Todo } from './types.js';

export interface ApiError<TDetails = unknown> {
  error: string;
  code: ErrorCode;
  details?: TDetails;
}

export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Version conflict error with the current server state.
 */
export interface VersionConflictError extends ApiError<{ currentTodo: Todo }> {
  code: typeof ErrorCodes.VERSION_CONFLICT;
  details: { currentTodo: Todo };
}
