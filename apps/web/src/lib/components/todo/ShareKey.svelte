<script lang="ts">
  import { Button, IconClipboard } from '$lib/components/ui';

  interface Props {
    joinKey: string;
  }

  let { joinKey }: Props = $props();

  async function copy() {
    await navigator.clipboard.writeText(joinKey);
  }
</script>

<div class="flex items-center justify-end gap-1 mb-4 pb-4 border-b border-border/60 select-none">
  <div class="flex items-center gap-2">
    <span class="text-xs text-text-muted uppercase tracking-wide">Share Key:</span>
    <code class="font-mono text-xs bg-surface px-2 py-1 rounded text-white select-all">
      {joinKey}
    </code>
  </div>
  <Button variant="ghost" size="xs" onclick={copy}>
    <IconClipboard class="w-3 h-3 mr-1" />
    Copy
  </Button>
</div>
