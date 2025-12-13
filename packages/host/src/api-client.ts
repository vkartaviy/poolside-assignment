/**
 * REST API client using HostPlatform.
 */

import type {
  ApiError,
  BootstrapRequest,
  BootstrapResponse,
  CreateListRequest,
  CreateListResponse,
  CreateTodoRequest,
  CreateTodoResponse,
  HostFetchResponse,
  HostPlatform,
  HttpMethod,
  JoinListRequest,
  JoinListResponse,
  SyncTodosRequest,
  SyncTodosResponse,
  Todo,
  UpdateTodoStateRequest,
  UpdateTodoStateResponse,
  VersionConflictError,
} from '@poolside/core';
import { retry } from '@poolside/core/utils';
import { ApiRequestError, NetworkError, parseApiError } from './errors.js';

export interface Protocol {
  bootstrap(request: BootstrapRequest): Promise<BootstrapResponse>;
  createList(request: CreateListRequest): Promise<CreateListResponse>;
  joinList(request: JoinListRequest): Promise<JoinListResponse>;
  syncTodos(request: SyncTodosRequest): Promise<SyncTodosResponse>;
  createTodo(listId: string, request: CreateTodoRequest): Promise<CreateTodoResponse>;
  updateTodoState(
    todoId: string,
    request: UpdateTodoStateRequest
  ): Promise<UpdateTodoStateResponse>;
}

interface ApiClientOptions {
  platform: HostPlatform;
  apiBaseUrl: string;
}

export class ApiClient implements Protocol {
  private readonly platform: HostPlatform;
  private readonly apiBase: string;

  constructor(options: ApiClientOptions) {
    this.platform = options.platform;
    this.apiBase = options.apiBaseUrl;
  }

  async bootstrap(request: BootstrapRequest): Promise<BootstrapResponse> {
    return this.requestWithRetry('POST', '/auth/bootstrap', request);
  }

  async createList(request: CreateListRequest): Promise<CreateListResponse> {
    return this.requestWithRetry('POST', '/lists', request);
  }

  async joinList(request: JoinListRequest): Promise<JoinListResponse> {
    return this.requestWithRetry('POST', '/lists/join', request);
  }

  async syncTodos(request: SyncTodosRequest): Promise<SyncTodosResponse> {
    const { listId, userId, syncToken } = request;
    const url = new URL(`${this.apiBase}/lists/${listId}/todos`);

    url.searchParams.set('userId', userId);

    if (syncToken) {
      url.searchParams.set('syncToken', syncToken);
    }

    // Use full URL since we built it with searchParams
    return this.requestWithRetry('GET', url.toString().replace(this.apiBase, ''));
  }

  async createTodo(listId: string, request: CreateTodoRequest): Promise<CreateTodoResponse> {
    return this.requestWithRetry('POST', `/lists/${listId}/todos`, request);
  }

  async updateTodoState(
    todoId: string,
    request: UpdateTodoStateRequest
  ): Promise<UpdateTodoStateResponse> {
    const response = await this.request<Todo | VersionConflictError>(
      'PATCH',
      `/todos/${todoId}/state`,
      request
    );

    // Handle version conflict - server always returns currentTodo
    if (response.status === 409) {
      const conflict = response.data as VersionConflictError | undefined;
      const currentTodo = conflict?.details?.currentTodo;

      if (!currentTodo) {
        // Unexpected: server should always provide currentTodo for version conflicts
        // This is defensive - treat as a non-conflict error
        throw new ApiRequestError(
          'Version conflict without current todo state',
          'VERSION_CONFLICT',
          409
        );
      }

      return { ok: false, conflict: true, currentTodo };
    }

    if (response.status >= 400) {
      this.handleErrorResponse(response);
    }

    return { ok: true, todo: response.data as Todo };
  }

  getListEventsUrl(listId: string): string {
    return `${this.apiBase}/lists/${listId}/events`;
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown
  ): Promise<HostFetchResponse<T>> {
    const url = path.startsWith('http') ? path : `${this.apiBase}${path}`;

    try {
      return await this.platform.fetch<T>({
        method,
        url,
        ...(body ? { body } : {}),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      if (err instanceof TypeError) {
        throw new NetworkError('Failed to connect to server', err);
      }
      throw err;
    }
  }

  private handleErrorResponse<T>(response: HostFetchResponse<T>): never {
    const errorBody = response.data as ApiError | undefined;

    if (errorBody?.code) {
      throw parseApiError(response.status, errorBody);
    }

    throw new ApiRequestError(
      errorBody?.error ?? `HTTP ${response.status}`,
      'UNKNOWN',
      response.status
    );
  }

  private async requestWithRetry<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    return retry(
      async () => {
        const response = await this.request<T>(method, path, body);

        if (response.status >= 500) {
          throw new ApiRequestError(`HTTP ${response.status}`, 'SERVER_ERROR', response.status);
        }

        if (response.status >= 400) {
          this.handleErrorResponse(response);
        }

        return response.data as T;
      },
      {
        shouldRetry: (err: Error) => {
          if (err instanceof NetworkError) {
            return true;
          }

          if (err instanceof ApiRequestError) {
            return err.statusCode >= 500;
          }

          return false;
        },
      }
    );
  }
}
