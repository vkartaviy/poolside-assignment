<script lang="ts">
  import { EmptyState, IconExclamationTriangle } from '$lib/components/ui';
  import TodoListSetupActions from '../todo/TodoListSetupActions.svelte';

  interface Props {
    mode: 'not-found' | 'no-list';
  }

  let { mode }: Props = $props();

  const { status, title, description } = $derived(
    mode === 'not-found'
      ? {
          status: 'error',
          title: 'List not found',
          description: 'This list no longer exists.',
        }
      : {
          title: 'No list selected',
          description: 'Create a new list or join an existing one using a key.',
        }
  );
</script>

<EmptyState {title} {description}>
  {#snippet icon()}
    {#if status === 'error'}
      <IconExclamationTriangle class="w-12 h-12 text-error" />
    {/if}
  {/snippet}

  {#snippet actions()}
    <TodoListSetupActions />
  {/snippet}
</EmptyState>
