<script lang="ts">
  import { fade } from 'svelte/transition';
  import TodoItem from './TodoItem.svelte';
  import AddTodo from './AddTodo.svelte';
  import ShareKey from './ShareKey.svelte';
  import { createTodo } from '$lib/actions';
  import { activeTodos, listStore, syncStore } from '$lib/stores';
  import { IconLoaderCircle } from '$lib/components/ui';

  // Show loading when syncing with no todos yet
  const isLoading = $derived($activeTodos.length === 0 && $syncStore.status === 'syncing');
</script>

<div class="flex-1 flex flex-col min-h-0 max-w-200 mx-auto w-full">
  <div class="px-4 pt-4">
    {#if $listStore.joinKey}
      <ShareKey joinKey={$listStore.joinKey} />
    {/if}

    <div class="mb-4 pb-4 border-b border-border/60 select-none">
      <AddTodo onAdd={createTodo} />
    </div>
  </div>

  <div class="flex-1 flex flex-col gap-2 p-4 pt-0 overflow-y-auto no-scrollbar">
    {#if isLoading}
      <div
        class="flex items-center justify-center gap-2 text-text-dim py-12 text-sm"
        in:fade={{ duration: 1000, delay: 400 }}
      >
        <IconLoaderCircle class="w-4 h-4 animate-spin" />
        Loading todos…
      </div>
    {:else}
      {#each $activeTodos as todo (todo.id)}
        <TodoItem {todo} />
      {:else}
        <div class="text-center text-text-dim py-12 text-sm">No todos yet. Add one above!</div>
      {/each}
    {/if}
  </div>
</div>
