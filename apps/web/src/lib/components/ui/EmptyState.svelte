<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    icon?: Snippet;
    actions?: Snippet;
    children?: Snippet;
  }

  let { title, description, icon, actions, children }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center flex-1 gap-3 text-text-muted">
  {#if icon}
    {@render icon()}
  {/if}

  <h2 class="text-xl font-medium text-text">{title}</h2>

  {#if description}
    <p class="text-sm text-center max-w-sm">{description}</p>
  {/if}

  {#if actions}
    <div class="flex gap-2 mt-2">
      {@render actions()}
    </div>
  {/if}

  {#if children}
    {@render children()}
  {/if}
</div>
