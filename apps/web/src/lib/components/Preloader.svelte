<script lang="ts">
  import { fade } from 'svelte/transition';
  import { authStore } from '$lib/stores';
  import logo from '$lib/assets/logo/poolside-logo-gradient-white.svg';
</script>

{#if $authStore.status !== 'ready'}
  <div class="fixed z-9999 inset-0 flex bg-background p-10" out:fade={{ duration: 200 }}>
    <div class="flex-1 flex items-center justify-center opacity-0 animate-fade-in-delayed">
      <img
        src={logo}
        alt="Poolside"
        class="w-full max-w-56 animate-pulse select-none pointer-events-none"
      />
    </div>
  </div>
{/if}
