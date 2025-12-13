<script lang="ts">
  import { hostPlatform } from '$lib/host-platform';
  import { Button, IconPlus } from '$lib/components/ui';
  import { listStore, openJoinDialog } from '$lib/stores';
  import { createList } from '$lib/actions';

  const disabled = $derived($listStore.actionStatus !== 'idle');

  async function handleClick() {
    if (disabled) {
      return;
    }

    const result = await hostPlatform.showContextMenu([
      { label: 'Create New List', id: 'new' },
      { label: 'Join Existing List', id: 'join' },
    ]);

    if (result === 'new') {
      createList();
    } else if (result === 'join') {
      openJoinDialog();
    }
  }
</script>

<Button variant="tool" size="auto" onclick={handleClick} {disabled}>
  <IconPlus class="w-5 h-5" />
</Button>
