<script lang="ts">
  import type { Todo } from '@poolside/core';
  import { updateTodoState } from '$lib/actions';
  import TodoActions from './TodoActions.svelte';
  import TodoMeta from './TodoMeta.svelte';

  interface Props {
    todo: Todo;
  }

  let { todo }: Props = $props();

  function handleStateChange(nextState: Parameters<typeof updateTodoState>[1]) {
    updateTodoState(todo.id, nextState);
  }
</script>

<div
  class="group relative flex items-center justify-between w-full gap-2 p-4 bg-surface rounded-lg border border-border transition-colors hover:border-border-hover"
  class:opacity-60={todo.state === 'DONE'}
>
  <div class="flex flex-col gap-2 w-full">
    <div
      class="text-base line-clamp-3 text-ellipsis -mt-1 text-text"
      class:line-through={todo.state === 'DONE'}
    >
      {todo.title}
    </div>
    <TodoMeta {todo} />
  </div>

  <TodoActions {todo} onStateChange={handleStateChange} />
</div>
