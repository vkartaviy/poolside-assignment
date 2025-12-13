<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = 'w-4 h-4' }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
>
  <path d="M12 2v4" />
  <path d="m16.2 7.8 2.9-2.9" />
  <path d="M18 12h4" />
  <path d="m16.2 16.2 2.9 2.9" />
  <path d="M12 18v4" />
  <path d="m4.9 19.1 2.9-2.9" />
  <path d="M2 12h4" />
  <path d="m4.9 4.9 2.9 2.9" />
</svg>
