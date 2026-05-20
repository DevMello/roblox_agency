import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: ReactNode
  pad?: boolean
  hover?: boolean
  className?: string
}

export function Card({ children, pad = false, hover = false, className }: CardProps) {
  return (
    <div
      className={clsx(
        'card',
        pad && 'card-pad',
        hover && 'card-hover',
        className,
      )}
    >
      {children}
    </div>
  )
}
