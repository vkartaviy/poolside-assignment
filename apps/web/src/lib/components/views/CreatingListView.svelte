<script lang="ts">
  import { LoadingState, IconListBullet } from '$lib/components/ui';
</script>

<LoadingState title="Creating list…" description="Hang tight — setting things up.">
  {#snippet icon()}
    <IconListBullet class="w-12 h-12 text-text-muted" animate />
  {/snippet}
</LoadingState>
