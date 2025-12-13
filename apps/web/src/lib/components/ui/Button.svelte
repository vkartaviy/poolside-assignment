<script lang="ts">
  import { tv, type VariantProps } from 'tailwind-variants';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  const button = tv({
    base: [
      'inline-flex items-center justify-center',
      'font-medium transition-colors',
      'cursor-pointer select-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
      'disabled:pointer-events-none disabled:opacity-50',
      '-webkit-app-region: no-drag',
    ],
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-hover',
        secondary: 'bg-surface-hover text-text hover:bg-surface-active',
        success: 'bg-success text-white hover:bg-success-hover',
        danger: 'bg-transparent text-error hover:bg-error/10',
        ghost: 'bg-transparent text-text-muted hover:text-text',
        tool: 'bg-transparent text-text-muted hover:text-text hover:bg-surface-hover h-7 w-7 rounded-md',
      },
      size: {
        xs: 'h-6 px-2 text-xs rounded-sm',
        sm: 'h-8 px-3 text-xs rounded-md',
        md: 'h-9 px-4 text-sm rounded-md',
        lg: 'h-10 px-6 text-sm rounded-lg',
        auto: '',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  });

  type ButtonVariants = VariantProps<typeof button>;

  interface Props extends HTMLButtonAttributes {
    variant?: ButtonVariants['variant'];
    size?: ButtonVariants['size'];
    class?: string;
    children?: Snippet;
  }

  let {
    variant = 'secondary',
    size = 'md',
    class: className,
    children,
    ...restProps
  }: Props = $props();
</script>

<button class={button({ variant, size, class: className })} {...restProps}>
  {@render children?.()}
</button>
