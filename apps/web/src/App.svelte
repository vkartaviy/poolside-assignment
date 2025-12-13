<script lang="ts">
  import { Header } from '$lib/components/header';
  import { TodoList } from '$lib/components/todo';
  import { StatusPanel } from '$lib/components/status';
  import { SessionExpiredView, ListSetupView, CreatingListView } from '$lib/components/views';
  import JoinDialog from '$lib/components/JoinDialog.svelte';
  import Preloader from '$lib/components/Preloader.svelte';
  import { currentView } from '$lib/stores';
  import { bootstrap } from '$lib/actions';

  $effect(() => {
    bootstrap();
  });
</script>

{#if $currentView === 'session-expired'}
  <SessionExpiredView />
{:else}
  <main class="flex flex-col h-screen">
    <Header />

    <div class="flex-1 flex flex-col min-h-0 mx-1 mt-10">
      {#if $currentView === 'not-found'}
        <ListSetupView mode="not-found" />
      {:else if $currentView === 'todo-list'}
        <TodoList />
      {:else if $currentView === 'creating'}
        <CreatingListView />
      {:else}
        <ListSetupView mode="no-list" />
      {/if}
    </div>
  </main>

  <StatusPanel />
  <JoinDialog />
{/if}

<Preloader />
