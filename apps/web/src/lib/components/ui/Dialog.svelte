<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: Snippet;
    actions?: Snippet;
  }

  let { open, onClose, title, description, children, actions }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
    onclick={onClose}
    role="presentation"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="bg-surface rounded-xl p-6 w-full max-w-md border border-border"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      {#if title}
        <h2 class="text-lg font-semibold text-white mb-2">{title}</h2>
      {/if}
      {#if description}
        <p class="text-sm text-text-muted mb-5">{description}</p>
      {/if}

      {@render children()}

      {#if actions}
        <div class="flex gap-3 justify-end mt-5">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
{/if}
