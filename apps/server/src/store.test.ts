import { beforeEach, describe, expect, it } from 'vitest';
import type { Todo } from '@poolside/core';
import { clearStore, createTodo, getTodosForList, compareAndSwapTodo, getTodo } from './store.js';

describe('Todo Sync Cursor', () => {
  const listId = 'list-1';
  const userId = 'user-1';
  const createdAt = '2025-01-01T00:00:00.000Z';

  beforeEach(async () => {
    await clearStore();
  });

  it('sorts todos by updatedAt then id', async () => {
    const t1 = '2025-01-01T00:00:00.000Z';
    const t2 = '2025-01-01T00:00:00.001Z';

    const todos: Todo[] = [
      {
        id: 'b',
        listId,
        title: 'B',
        state: 'TODO',
        createdBy: userId,
        createdAt,
        updatedAt: t1,
        version: 1,
      },
      {
        id: 'a',
        listId,
        title: 'A',
        state: 'TODO',
        createdBy: userId,
        createdAt,
        updatedAt: t1,
        version: 1,
      },
      {
        id: 'c',
        listId,
        title: 'C',
        state: 'TODO',
        createdBy: userId,
        createdAt,
        updatedAt: t2,
        version: 1,
      },
    ];

    for (const todo of todos) {
      await createTodo(todo);
    }

    const result = await getTodosForList(listId);
    expect(result.map((todo) => todo.id)).toEqual(['a', 'b', 'c']);
  });

  it('filters by (updatedAt, todoId) cursor', async () => {
    const t1 = '2025-01-01T00:00:00.000Z';
    const t2 = '2025-01-01T00:00:00.001Z';

    await createTodo({
      id: 'a',
      listId,
      title: 'A',
      state: 'TODO',
      createdBy: userId,
      createdAt,
      updatedAt: t1,
      version: 1,
    });

    await createTodo({
      id: 'b',
      listId,
      title: 'B',
      state: 'TODO',
      createdBy: userId,
      createdAt,
      updatedAt: t1,
      version: 1,
    });

    await createTodo({
      id: 'c',
      listId,
      title: 'C',
      state: 'TODO',
      createdBy: userId,
      createdAt,
      updatedAt: t2,
      version: 1,
    });

    const result = await getTodosForList(listId, { updatedAt: t1, todoId: 'a' });
    expect(result.map((todo) => todo.id)).toEqual(['b', 'c']);
  });

  it('accepts cursor without todoId (back-compat)', async () => {
    const t1 = '2025-01-01T00:00:00.000Z';
    const t2 = '2025-01-01T00:00:00.001Z';

    await createTodo({
      id: 'a',
      listId,
      title: 'A',
      state: 'TODO',
      createdBy: userId,
      createdAt,
      updatedAt: t1,
      version: 1,
    });

    await createTodo({
      id: 'b',
      listId,
      title: 'B',
      state: 'TODO',
      createdBy: userId,
      createdAt,
      updatedAt: t1,
      version: 1,
    });

    await createTodo({
      id: 'c',
      listId,
      title: 'C',
      state: 'TODO',
      createdBy: userId,
      createdAt,
      updatedAt: t2,
      version: 1,
    });

    const result = await getTodosForList(listId, { updatedAt: t1 });
    expect(result.map((todo) => todo.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('compareAndSwapTodo', () => {
  const listId = 'list-1';
  const userId = 'user-1';
  const createdAt = '2025-01-01T00:00:00.000Z';

  beforeEach(async () => {
    await clearStore();
  });

  it('returns success when version matches', async () => {
    await createTodo({
      id: 'todo-1',
      listId,
      title: 'Test',
      state: 'TODO',
      createdBy: userId,
      createdAt,
      updatedAt: createdAt,
      version: 1,
    });

    const result = await compareAndSwapTodo('todo-1', 1, {
      state: 'IN_PROGRESS',
      updatedAt: '2025-01-01T00:00:01.000Z',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.todo.state).toBe('IN_PROGRESS');
      expect(result.todo.version).toBe(2);
    }
  });

  it('returns conflict with currentTodo when version mismatches', async () => {
    await createTodo({
      id: 'todo-1',
      listId,
      title: 'Test',
      state: 'TODO',
      createdBy: userId,
      createdAt,
      updatedAt: createdAt,
      version: 2,
    });

    const result = await compareAndSwapTodo('todo-1', 1, {
      state: 'IN_PROGRESS',
      updatedAt: '2025-01-01T00:00:01.000Z',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('conflict');
      if (result.reason === 'conflict') {
        expect(result.currentTodo.version).toBe(2);
        expect(result.currentTodo.state).toBe('TODO');
      }
    }
  });

  it('returns not-found when todo does not exist', async () => {
    const result = await compareAndSwapTodo('nonexistent', 1, {
      state: 'IN_PROGRESS',
      updatedAt: '2025-01-01T00:00:01.000Z',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('not-found');
    }
  });
});
