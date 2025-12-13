/**
 * Protocol types and helpers for client-server communication.
 */

import type { Todo, TodoList, TodoState, User } from './types.js';

// ============================================================================
// API Request/Response Types
// ============================================================================

// Auth
export interface BootstrapRequest {
  /** If provided, returns the existing user. Otherwise creates a new user. */
  userId?: string;
}

export interface BootstrapResponse {
  user: User;
}

// Lists
export interface CreateListRequest {
  userId: string;
}

export interface CreateListResponse {
  listId: string;
  joinKey: string;
}

export interface JoinListRequest {
  userId: string;
  joinKey: string;
}

export interface JoinListResponse {
  listId: string;
  list: TodoList;
}

// Todos
export interface SyncTodosRequest {
  userId: string;
  listId: string;
  syncToken?: string;
}

export interface SyncTodosResponse {
  todos: Todo[];
  syncToken: string;
}

export interface CreateTodoRequest {
  id: string;
  title: string;
  userId: string;
  createdAt: string; // ISO 8601
}

export interface CreateTodoResponse extends Todo {}

export interface UpdateTodoStateRequest {
  userId: string;
  nextState: TodoState;
  expectedVersion: number;
}

/**
 * Response from updating a todo's state.
 *
 * Discriminated union for type-safe handling:
 * - { ok: true, todo } - Update succeeded
 * - { ok: false, conflict: true, currentTodo } - Version conflict, includes current state
 * - { ok: false, conflict: false } - Other error (e.g., not found, invalid transition)
 */
export type UpdateTodoStateResponse =
  | { ok: true; todo: Todo }
  | { ok: false; conflict: true; currentTodo: Todo }
  | { ok: false; conflict: false };
