import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 px-6 text-center ${className ?? ''}`}
    >
      {icon && (
        <div className="text-text-muted opacity-60 mb-1">{icon}</div>
      )}
      <p className="text-base font-semibold font-display text-text-primary">{title}</p>
      {description && (
        <p className="text-sm text-text-muted font-body max-w-sm">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
