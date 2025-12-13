<script lang="ts">
  import { type Todo, getAllowedNextStates, type TodoState } from '@poolside/core';
  import { Button } from '$lib/components/ui';

  interface Props {
    todo: Todo;
    onStateChange: (nextState: TodoState) => void;
  }

  let { todo, onStateChange }: Props = $props();

  const allowedNextStates = $derived(getAllowedNextStates(todo.state));

  function getButtonVariant(nextState: TodoState): 'primary' | 'secondary' {
    if (nextState === 'DONE') return 'primary';
    if (nextState === 'ONGOING') return 'primary';
    return 'secondary';
  }

  function getButtonLabel(currentState: TodoState, nextState: TodoState): string {
    if (currentState === 'TODO' && nextState === 'ONGOING') return 'Start';
    if (currentState === 'ONGOING' && nextState === 'DONE') return 'Complete';
    if (currentState === 'ONGOING' && nextState === 'TODO') return 'Todo';
    if (currentState === 'DONE' && nextState === 'ONGOING') return 'Reopen';
    return nextState;
  }
</script>

<div
  class="absolute right-4 top-0 bottom-0 flex items-center gap-2 pl-16 group-hover:opacity-100 opacity-0 bg-linear-to-r from-transparent via-[48px] via-surface/90 to-surface transition-opacity"
>
  {#each allowedNextStates as nextState (nextState)}
    <Button
      size="sm"
      variant={getButtonVariant(nextState)}
      onclick={() => onStateChange(nextState)}
    >
      {getButtonLabel(todo.state, nextState)}
    </Button>
  {/each}
</div>
