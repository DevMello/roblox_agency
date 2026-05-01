import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent/90 border border-accent/80 disabled:opacity-50',
  secondary:
    'bg-surface text-text-primary border border-border hover:bg-border disabled:opacity-50',
  danger:
    'bg-danger/10 text-danger border border-danger/40 hover:bg-danger/20 disabled:opacity-50',
  ghost:
    'bg-transparent text-text-muted border border-transparent hover:text-text-primary hover:bg-border disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 cursor-pointer select-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
})
