<script lang="ts">
  import type { Todo, TodoState } from '@poolside/core';
  import { Badge, type BadgeVariant } from '$lib/components/ui';

  interface Props {
    todo: Todo;
  }

  let { todo }: Props = $props();

  const stateBadgeVariant: Record<TodoState, BadgeVariant> = {
    TODO: 'default',
    ONGOING: 'warning',
    DONE: 'success',
  };
</script>

<div class="flex items-center gap-3 select-none min-w-0">
  <Badge variant={stateBadgeVariant[todo.state]}>
    {todo.state}
  </Badge>
  <span class="text-xs text-text-dim whitespace-nowrap tabular-nums">
    Updated {new Date(todo.updatedAt).toLocaleTimeString()}
  </span>
</div>
