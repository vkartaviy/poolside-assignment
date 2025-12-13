<script module lang="ts">
  const variantStyles = {
    default: 'bg-text-muted text-white',
    primary: 'bg-primary text-white',
    success: 'bg-success text-white',
    warning: 'bg-warning text-black',
    error: 'bg-error text-white',
  } as const;

  export type BadgeVariant = keyof typeof variantStyles;
</script>

<script lang="ts">
  import { tv } from 'tailwind-variants';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  const badge = tv({
    base: ['inline-flex items-center', 'px-2 py-0.5', 'text-xs font-semibold uppercase', 'rounded'],
    variants: {
      variant: variantStyles,
    },
    defaultVariants: {
      variant: 'default',
    },
  });

  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'class'> {
    variant?: BadgeVariant;
    class?: string;
    children?: Snippet;
  }

  let { variant = 'default', class: className, children, ...restProps }: Props = $props();
</script>

<span class={badge({ variant, class: className })} {...restProps}>
  {@render children?.()}
</span>
