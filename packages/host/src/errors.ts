/**
 * API error classes for handling server errors in the UI.
 */

import { ErrorCodes, type ApiError } from '@poolside/core';

const OfflineErrorMessagesRegex = /request failed|failed to fetch|network\s?error|timeout/i;

/**
 * Base class for API errors.
 */
export class ApiRequestError extends Error {
  readonly name: string = 'ApiRequestError';
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);

    this.code = code;
    this.statusCode = statusCode;
  }

  /**
   * User-friendly error message for UI display.
   */
  get userMessage(): string {
    return this.message;
  }
}

/**
 * Resource not found (404).
 */
export class NotFoundError extends ApiRequestError {
  readonly name: string = 'NotFoundError';

  constructor(message: string = 'Resource not found') {
    super(message, ErrorCodes.NOT_FOUND, 404);
  }

  get userMessage(): string {
    if (this.message.toLowerCase().includes('list')) {
      return 'This list no longer exists. It may have been deleted or the server was restarted.';
    }
    if (this.message.toLowerCase().includes('todo')) {
      return 'This todo no longer exists.';
    }
    return 'The requested resource was not found.';
  }
}

/**
 * Unauthorized access (401/403).
 */
export class UnauthorizedError extends ApiRequestError {
  readonly name: string = 'UnauthorizedError';

  constructor(message: string = 'Unauthorized', statusCode: number = 403) {
    super(message, ErrorCodes.UNAUTHORIZED, statusCode);
  }

  get userMessage(): string {
    if (this.statusCode === 401) {
      return 'Your session is no longer valid. Refresh the app to continue.';
    }
    return "You don't have permission to perform this action.";
  }
}

/**
 * Invalid state transition.
 */
export class InvalidTransitionError extends ApiRequestError {
  readonly name: string = 'InvalidTransitionError';

  constructor(message: string = 'Invalid state transition') {
    super(message, ErrorCodes.INVALID_TRANSITION, 400);
  }

  get userMessage(): string {
    return 'This state change is not allowed.';
  }
}

/**
 * Validation error (400).
 */
export class ValidationError extends ApiRequestError {
  readonly name: string = 'ValidationError';

  constructor(message: string = 'Validation error') {
    super(message, ErrorCodes.VALIDATION_ERROR, 400);
  }

  get userMessage(): string {
    return this.message;
  }
}

/**
 * Network or connection error.
 */
export class NetworkError extends Error {
  readonly name: string = 'NetworkError';

  constructor(message: string = 'Network error', cause?: Error | unknown) {
    super(message, { cause });
  }

  get userMessage(): string {
    return 'Unable to connect to the server. Please check your connection.';
  }

  get isOfflineError(): boolean {
    if (this.cause instanceof Error) {
      return OfflineErrorMessagesRegex.test(this.cause.message);
    }

    return false;
  }
}

/**
 * Parse API error response and return appropriate error class.
 */
export function parseApiError(statusCode: number, errorBody: ApiError): ApiRequestError {
  const { error, code } = errorBody;

  switch (code) {
    case ErrorCodes.NOT_FOUND:
      return new NotFoundError(error);
    case ErrorCodes.UNAUTHORIZED:
      return new UnauthorizedError(error, statusCode);
    case ErrorCodes.INVALID_TRANSITION:
      return new InvalidTransitionError(error);
    case ErrorCodes.VALIDATION_ERROR:
      return new ValidationError(error);
    default:
      return new ApiRequestError(error, code, statusCode);
  }
}

/**
 * Type guard to check if error is a specific API error.
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/** Extract user-friendly message from an error */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error && 'userMessage' in err) {
    return (err as ApiRequestError).userMessage;
  }
  return String(err);
}
