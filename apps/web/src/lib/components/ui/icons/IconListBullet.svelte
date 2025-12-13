<script lang="ts">
  interface Props {
    class?: string;
    animate?: boolean;
  }

  let { class: className = 'w-4 h-4', animate = false }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
  stroke-width="1.5"
  stroke="currentColor"
  class={className}
>
  <!-- Line 1: bullet + line -->
  <path
    class={animate ? 'draw-animation line-1' : ''}
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM8.25 6.75h12"
    pathLength="1"
  />
  <!-- Line 2: bullet + line -->
  <path
    class={animate ? 'draw-animation line-2' : ''}
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM8.25 12h12"
    pathLength="1"
  />
  <!-- Line 3: bullet + line -->
  <path
    class={animate ? 'draw-animation line-3' : ''}
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M3.75 17.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM8.25 17.25h12"
    pathLength="1"
  />
</svg>

<style>
  path {
    &.draw-animation {
      stroke-dasharray: 1;
      stroke-dashoffset: 1;

      &.line-1 {
        animation: draw-line-1 2.4s ease-out infinite;
      }

      &.line-2 {
        animation: draw-line-2 2.4s ease-out infinite;
      }

      &.line-3 {
        animation: draw-line-3 2.4s ease-out infinite;
      }
    }
  }

  /* Line 1: draws 0-15%, visible 15-80%, resets 80-100% */
  @keyframes draw-line-1 {
    0% {
      stroke-dashoffset: 1;
    }
    15%,
    80% {
      stroke-dashoffset: 0;
    }
    95%,
    100% {
      stroke-dashoffset: 1;
    }
  }

  /* Line 2: waits, draws 20-35%, visible 35-80%, resets 80-100% */
  @keyframes draw-line-2 {
    0%,
    20% {
      stroke-dashoffset: 1;
    }
    35%,
    80% {
      stroke-dashoffset: 0;
    }
    95%,
    100% {
      stroke-dashoffset: 1;
    }
  }

  /* Line 3: waits, draws 40-55%, visible 55-80%, resets 80-100% */
  @keyframes draw-line-3 {
    0%,
    40% {
      stroke-dashoffset: 1;
    }
    55%,
    80% {
      stroke-dashoffset: 0;
    }
    95%,
    100% {
      stroke-dashoffset: 1;
    }
  }
</style>
