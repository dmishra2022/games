import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children?: ReactNode;
};

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-ns-cyan/90 text-black hover:bg-ns-cyan shadow-ns-cyan ' +
    'disabled:bg-ns-dim disabled:text-neutral-500 disabled:shadow-none',
  secondary:
    'bg-ns-magenta/90 text-black hover:bg-ns-magenta shadow-ns-magenta ' +
    'disabled:bg-ns-dim disabled:text-neutral-500 disabled:shadow-none',
  danger:
    'bg-ns-red/90 text-white hover:bg-ns-red ' +
    'disabled:bg-ns-dim disabled:text-neutral-500',
  ghost:
    'bg-ns-panel/70 text-white hover:bg-ns-panel ' +
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

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
