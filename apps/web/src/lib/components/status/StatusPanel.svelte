<script lang="ts">
  import { fade } from 'svelte/transition';
  import StatusIndicator from './StatusIndicator.svelte';
  import { listStore, connectionStore, syncStore } from '$lib/stores';

  type DisplayState = 'connecting' | 'disconnected' | 'syncing' | 'error' | null;

  interface Props {
    showDelay?: number;
  }

  let { showDelay = 600 }: Props = $props();

  // Compute current display state
  const currentState = $derived.by((): DisplayState => {
    if ($listStore.listId == null) return null;
    if ($connectionStore.status === 'connecting') return 'connecting';
    if ($connectionStore.status === 'disconnected') return 'disconnected';
    if ($syncStore.status === 'syncing') return 'syncing';
    if ($syncStore.status === 'error') return 'error';
    return null;
  });

  // Deferred visibility and snapshotted state for fade-out
  let showPanel = $state(false);
  let displayState = $state<DisplayState>(null);
  let displayError = $state<string | null>(null);
  let showTimeout: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (currentState != null) {
      // Update displayed state while visible
      displayState = currentState;
      displayError = $syncStore.error;

      // Delay showing the panel to avoid flicker on fast operations
      if (!showPanel) {
        showTimeout = setTimeout(() => (showPanel = true), showDelay);
      }
    } else {
      // Hide panel but keep displayState for fade-out
      if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
      }
      showPanel = false;
    }

    return () => {
      if (showTimeout) {
        clearTimeout(showTimeout);
      }
    };
  });
</script>

<div class="fixed w-full bottom-4 flex items-center justify-center">
  {#if showPanel && displayState}
    <div
      transition:fade={{ duration: 400 }}
      class="flex items-center justify-center gap-2 bg-surface/50 border border-border backdrop-blur shadow-2xl rounded-lg px-3 py-2 text-xs"
    >
      <StatusIndicator status={displayState} error={displayError} />
    </div>
  {/if}
</div>
