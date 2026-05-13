import { type ReactNode } from 'react'
import { clsx } from 'clsx'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'muted'

interface BadgeProps {
  variant?: Variant
  children: ReactNode
  className?: string
}

const variantClasses: Record<Variant, string> = {
  default:
    'bg-border/40 text-text-primary border border-border',
  success:
    'bg-success/10 text-success border border-success/30',
  warning:
    'bg-warning/10 text-warning border border-warning/30',
  danger:
    'bg-danger/10 text-danger border border-danger/30',
  accent:
    'bg-accent/10 text-accent border border-accent/30',
  muted:
    'bg-surface text-text-muted border border-border',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-body',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
