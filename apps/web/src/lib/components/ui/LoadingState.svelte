<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    icon?: Snippet;
  }

  let { title, description, icon }: Props = $props();
</script>

<div
  class="flex flex-col items-center justify-center flex-1 gap-2 text-text-muted select-none"
  in:fade={{ duration: 1000, delay: 400 }}
>
  {#if icon}
    {@render icon()}
  {/if}

  <h2 class="text-xl font-medium text-text">{title}</h2>

  {#if description}
    <p class="text-sm text-center max-w-sm">
      {description}
    </p>
  {/if}
</div>
