import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children?: ReactNode;
};

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-neon-magenta/90 text-black hover:bg-neon-magenta shadow-neon-magenta ' +
    'disabled:bg-neon-dim disabled:text-neutral-500 disabled:shadow-none',
  secondary:
    'bg-neon-cyan/90 text-black hover:bg-neon-cyan shadow-neon-cyan ' +
    'disabled:bg-neon-dim disabled:text-neutral-500 disabled:shadow-none',
  danger:
    'bg-red-500/80 text-white hover:bg-red-500 ' +
    'disabled:bg-neon-dim disabled:text-neutral-500',
  ghost:
    'bg-neon-panel/70 text-white hover:bg-neon-panel ' +
    'disabled:text-neutral-500',
};

export default function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={
        'inline-flex min-h-[44px] items-center justify-center rounded-md px-4 py-2 ' +
        'text-sm font-semibold uppercase tracking-wider transition ' +
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ' +
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ' +
        VARIANT[variant] +
        ' ' +
        className
      }
    >
      {children}
    </button>
  );
}
