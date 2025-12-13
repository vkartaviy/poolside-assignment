<script lang="ts">
  import { Button, Input } from '$lib/components/ui';

  interface Props {
    onAdd: (title: string) => void;
  }

  let { onAdd }: Props = $props();
  let title = $state('');

  function handleSubmit(e: Event) {
    e.preventDefault();

    const trimmed = title.trim();

    if (trimmed) {
      onAdd(trimmed);
      title = '';
    }
  }
</script>

<form class="flex items-center gap-3" onsubmit={handleSubmit}>
  <Input type="text" placeholder="Add a new todo…" bind:value={title} class="flex-1" />
  <Button type="submit" variant="primary" disabled={!title.trim()}>Add</Button>
</form>
