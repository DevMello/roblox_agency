import { type ReactNode } from 'react'
import { clsx } from 'clsx'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'muted'

interface BadgeProps {
  variant?: Variant
  children: ReactNode
  className?: string
}

const variantClasses: Record<Variant, string> = {
  default: 'chip',
  success: 'chip chip-success',
  warning: 'chip chip-warning',
  danger: 'chip chip-danger',
  accent: 'chip chip-accent',
  muted: 'chip',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={clsx(variantClasses[variant], className)}>
      {children}
    </span>
  )
}
