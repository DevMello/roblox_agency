import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: ReactNode
  hover?: boolean
  className?: string
}

export function Card({ children, hover = false, className }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-surface border border-border rounded-lg p-4',
        hover && 'transition-colors hover:border-accent/40 hover:bg-surface/80 cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}
