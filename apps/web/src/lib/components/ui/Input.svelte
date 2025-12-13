<script lang="ts">
  import { tv, type VariantProps } from 'tailwind-variants';
  import type { HTMLInputAttributes } from 'svelte/elements';

  const input = tv({
    base: [
      'w-full px-4 py-3',
      'bg-surface text-text',
      'border border-border rounded-lg',
      'outline-none transition-colors',
      'placeholder:text-text-dim',
      'focus:border-primary',
    ],
    variants: {
      size: {
        sm: 'h-8 px-3 py-2 text-xs',
        md: 'h-10 px-4 py-2.5 text-sm',
        lg: 'h-12 px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  });

  type InputVariants = VariantProps<typeof input>;

  interface Props extends Omit<HTMLInputAttributes, 'value' | 'class' | 'size'> {
    size?: InputVariants['size'];
    value?: string;
    class?: string;
  }

  let { size = 'md', class: className, value = $bindable(''), ...restProps }: Props = $props();
</script>

<input class={input({ size, class: className })} bind:value {...restProps} />
