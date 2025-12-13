<script lang="ts">
  import { Button, IconLoaderCircle } from '$lib/components/ui';
  import { listStore, openJoinDialog } from '$lib/stores';
  import { createList } from '$lib/actions';
</script>

<Button
  class="gap-2"
  variant="primary"
  onclick={createList}
  disabled={$listStore.actionStatus !== 'idle'}
>
  {#if $listStore.actionStatus === 'creating'}
    <IconLoaderCircle class="w-4 h-4 animate-spin" />
    Creating…
  {:else}
    Create New List
  {/if}
</Button>

<Button
  class="gap-2"
  variant="secondary"
  onclick={openJoinDialog}
  disabled={$listStore.actionStatus !== 'idle'}
>
  {#if $listStore.actionStatus === 'joining'}
    <IconLoaderCircle class="w-4 h-4 animate-spin" />
    Joining…
  {:else}
    Join Existing List
  {/if}
</Button>

{#if $listStore.actionError}
  <p class="text-sm text-error">{$listStore.actionError}</p>
{/if}
