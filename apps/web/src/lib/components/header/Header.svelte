<script lang="ts">
  import { cn } from '$lib/tailwind';
  import logo from '$lib/assets/logo/poolside-logo-gradient-white.svg';
  import ListMenu from './ListMenu.svelte';
  import UserMenu from './UserMenu.svelte';

  interface Props {
    className?: string;
  }

  let { className }: Props = $props();
</script>

<header
  class={cn(
    'fixed top-0 z-100 h-10',
    'flex items-center justify-end w-full',
    'bg-surface border-b border-border',
    '[-webkit-app-region:drag] select-none',
    className
  )}
>
  <div class="absolute flex w-full items-center justify-center pointer-events-none">
    <img src={logo} alt="poolside" class="h-5 w-auto opacity-80" />
  </div>

  <div class="flex items-center gap-1 pr-2 [-webkit-app-region:no-drag]">
    <ListMenu />
    <UserMenu />
  </div>
</header>
