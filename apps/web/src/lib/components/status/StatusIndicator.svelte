<script lang="ts">
  import {
    IconExclamationTriangle,
    IconArrowPath,
    IconSignalSlash,
    IconSignal,
  } from '$lib/components/ui';

  type Status = 'connecting' | 'disconnected' | 'syncing' | 'error';

  interface Props {
    status: Status;
    error?: string | null;
  }

  let { status, error }: Props = $props();
</script>

{#if status === 'connecting'}
  <IconSignal class="w-4 h-4 text-text-muted animate-pulse" />
  <span class="text-text-muted">Connecting</span>
{:else if status === 'disconnected'}
  <IconSignalSlash class="w-4 h-4 text-error" />
  <span class="text-error">No connection</span>
{:else if status === 'syncing'}
  <IconArrowPath class="w-4 h-4 text-text-muted animate-spin" />
  <span class="text-text-muted">Syncing</span>
{:else if status === 'error'}
  <IconExclamationTriangle class="w-4 h-4 text-error" />
  <span class="text-error" title={error ?? undefined}>Failed to sync changes</span>
{/if}
