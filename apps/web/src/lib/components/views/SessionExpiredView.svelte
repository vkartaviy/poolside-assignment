<script lang="ts">
  import { Button, EmptyState, IconExclamationTriangle } from '$lib/components/ui';

  function refresh() {
    window.location.reload();
  }
</script>

<main class="flex flex-col h-screen p-4">
  <EmptyState
    title="Session expired"
    description="Your session is no longer valid. Refresh the app to continue."
  >
    {#snippet icon()}
      <IconExclamationTriangle class="w-12 h-12 text-error" />
    {/snippet}

    {#snippet actions()}
      <Button variant="primary" onclick={refresh}>Refresh</Button>
    {/snippet}
  </EmptyState>
</main>
