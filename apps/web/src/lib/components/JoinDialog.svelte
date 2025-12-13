<script lang="ts">
  import { Button, Input, Dialog, IconLoaderCircle } from '$lib/components/ui';
  import { listStore, dialogStore, isJoining, closeJoinDialog } from '$lib/stores';
  import { joinList } from '$lib/actions';

  let joinKey = $state('');

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if ($isJoining) {
      return;
    }

    const trimmed = joinKey.trim();

    if (trimmed) {
      await joinList(trimmed);
    }
  }
</script>

{#if $dialogStore.isJoinDialogOpen}
  <Dialog
    open={true}
    onClose={closeJoinDialog}
    title="Join a List"
    description="Enter the join key shared with you."
  >
    <form onsubmit={handleSubmit}>
      <Input
        type="text"
        placeholder="Enter join key…"
        bind:value={joinKey}
        autofocus
        disabled={$isJoining}
      />
    </form>

    {#if $listStore.actionError && !$isJoining}
      <p class="text-sm text-error mt-3">{$listStore.actionError}</p>
    {/if}

    {#snippet actions()}
      <Button type="button" variant="secondary" onclick={closeJoinDialog} disabled={$isJoining}>
        Cancel
      </Button>
      <Button
        class="gap-2"
        type="submit"
        variant="primary"
        disabled={$isJoining || !joinKey.trim()}
        onclick={handleSubmit}
      >
        {#if $isJoining}
          <IconLoaderCircle class="w-4 h-4 animate-spin" />
          Joining…
        {:else}
          Join
        {/if}
      </Button>
    {/snippet}
  </Dialog>
{/if}
