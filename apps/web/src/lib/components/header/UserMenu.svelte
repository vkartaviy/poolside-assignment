<script lang="ts">
  import { hostPlatform } from '$lib/host-platform';
  import { Button, IconIdentification } from '$lib/components/ui';
  import { authStore } from '$lib/stores';

  async function handleClick() {
    if (!$authStore.user) {
      return;
    }

    const result = await hostPlatform.showContextMenu([
      { label: `Copy ID: ${$authStore.user.id.slice(0, 8)}...`, id: 'copy-id' },
    ]);

    if (result === 'copy-id') {
      await navigator.clipboard.writeText($authStore.user.id);
    }
  }
</script>

{#if $authStore.user}
  <Button variant="tool" size="auto" onclick={handleClick}>
    <IconIdentification class="w-5 h-5" />
  </Button>
{/if}
