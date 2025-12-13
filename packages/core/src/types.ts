/**
 * Core domain types
 */

export interface User {
  id: string;
  name?: string;
  createdAt: string; // ISO 8601
}

export interface TodoList {
  id: string;
  joinKey: string;
  createdAt: string; // ISO 8601
}

/**
 * TODO state follows a sequential state machine:
 * TODO → ONGOING → DONE → ONGOING → TODO
 */
export type TodoState = 'TODO' | 'ONGOING' | 'DONE';

export interface Todo {
  id: string;
  listId: string;
  title: string;
  state: TodoState;
  createdBy: string; // userId
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  version: number;
  deletedAt?: string; // ISO 8601, soft delete for sync
}
