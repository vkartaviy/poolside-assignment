/**
 * In-memory data store for the TODO app.
 *
 * This module exposes ONLY async data accessors and mutators.
 * The internal storage (Maps) is private and not exported.
 * This design allows swapping to a real database (SQLite, PostgreSQL, etc.)
 * without changing the route handlers.
 */

import type { Todo, TodoList, User } from '@poolside/core';

// ============================================================================
// Private Storage (not exported)
// ============================================================================

const users = new Map<string, User>();
const lists = new Map<string, TodoList>();
const todos = new Map<string, Todo>();

// Secondary indexes for faster lookups
const listsByJoinKey = new Map<string, string>(); // joinKey -> listId
const todosByList = new Map<string, Set<string>>(); // listId -> Set<todoId>

// ============================================================================
// User Operations
// ============================================================================

/**
 * Get a user by ID.
 */
export async function getUser(userId: string): Promise<User | undefined> {
  return users.get(userId);
}

/**
 * Create a new user.
 */
export async function createUser(user: User): Promise<User> {
  users.set(user.id, user);

  return user;
}

// ============================================================================
// List Operations
// ============================================================================

/**
 * Get a list by join key.
 */
export async function getListByJoinKey(joinKey: string): Promise<TodoList | undefined> {
  const listId = listsByJoinKey.get(joinKey);

  if (!listId) {
    return undefined;
  }

  return lists.get(listId);
}

/**
 * Check if a list exists.
 */
export async function listExists(listId: string): Promise<boolean> {
  return lists.has(listId);
}

/**
 * Create a new list.
 */
export async function createList(list: TodoList): Promise<TodoList> {
  lists.set(list.id, list);
  listsByJoinKey.set(list.joinKey, list.id);

  return list;
}

// ============================================================================
// Todo Operations
// ============================================================================

/**
 * Check if a todo should be included in delta sync results.
 * Returns true if todo is newer than the cursor position.
 *
 * Cursor comparison: (updatedAt, id) composite key
 * - todo.updatedAt > cursor.updatedAt → include
 * - todo.updatedAt === cursor.updatedAt AND todo.id > cursor.todoId → include
 */
function isTodoAfterCursor(todo: Todo, cursor: { updatedAt: string; todoId: string }): boolean {
  if (todo.updatedAt > cursor.updatedAt) return true;
  if (todo.updatedAt === cursor.updatedAt && todo.id > cursor.todoId) return true;
  return false;
}

/**
 * Get a todo by ID.
 */
export async function getTodo(todoId: string): Promise<Todo | undefined> {
  return todos.get(todoId);
}

/**
 * Get all todos for a list, optionally filtered by cursor.
 * Returns todos sorted by (updatedAt, id) ascending for delta sync.
 */
export async function getTodosForList(
  listId: string,
  cursor?: { updatedAt?: string; todoId?: string }
): Promise<Todo[]> {
  const todoIds = todosByList.get(listId);

  if (!todoIds) {
    return [];
  }

  const result: Todo[] = [];

  for (const todoId of todoIds) {
    const todo = todos.get(todoId);

    if (!todo) {
      continue;
    }

    // Filter by cursor if provided
    if (cursor?.updatedAt) {
      const cursorWithDefault = { updatedAt: cursor.updatedAt, todoId: cursor.todoId ?? '' };
      if (!isTodoAfterCursor(todo, cursorWithDefault)) {
        continue;
      }
    }

    result.push(todo);
  }

  return result.sort((a, b) => {
    if (a.updatedAt === b.updatedAt) {
      if (a.id === b.id) return 0;
      return a.id < b.id ? -1 : 1;
    }
    return a.updatedAt < b.updatedAt ? -1 : 1;
  });
}

/**
 * Create a new todo.
 */
export async function createTodo(todo: Todo): Promise<Todo> {
  todos.set(todo.id, todo);

  let listTodos = todosByList.get(todo.listId);

  if (!listTodos) {
    listTodos = new Set();
    todosByList.set(todo.listId, listTodos);
  }

  listTodos.add(todo.id);

  return todo;
}

/**
 * Update a todo in-place.
 * The caller should have already modified the todo object.
 */
export async function updateTodo(todo: Todo): Promise<Todo> {
  todos.set(todo.id, todo);

  return todo;
}

/**
 * Result of a compare-and-swap operation.
 *
 * Discriminated union with three possible outcomes:
 * - success: Update applied successfully
 * - conflict: Version mismatch (another update happened first)
 * - not-found: Todo does not exist
 */
export type CompareAndSwapResult =
  | { success: true; todo: Todo }
  | { success: false; reason: 'conflict'; currentTodo: Todo }
  | { success: false; reason: 'not-found' };

/**
 * Atomically update a todo only if the version matches.
 *
 * This is the in-memory equivalent of:
 *   UPDATE todos SET ... WHERE id = $1 AND version = $2
 *
 * Returns discriminated union:
 * - { success: true, todo } if updated
 * - { success: false, reason: 'conflict', currentTodo } if version didn't match
 * - { success: false, reason: 'not-found' } if todo doesn't exist
 */
export async function compareAndSwapTodo(
  todoId: string,
  expectedVersion: number,
  updates: Partial<Omit<Todo, 'id' | 'listId' | 'createdBy' | 'createdAt'>>
): Promise<CompareAndSwapResult> {
  const todo = todos.get(todoId);

  if (!todo) {
    return { success: false, reason: 'not-found' };
  }

  if (todo.version !== expectedVersion) {
    return { success: false, reason: 'conflict', currentTodo: todo };
  }

  // Apply updates and increment version atomically (no await between check and mutation)
  Object.assign(todo, updates);
  todo.version = expectedVersion + 1;

  return { success: true, todo };
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Clears all data from the store. Useful for testing.
 */
export async function clearStore(): Promise<void> {
  users.clear();
  lists.clear();
  todos.clear();
  listsByJoinKey.clear();
  todosByList.clear();
}
