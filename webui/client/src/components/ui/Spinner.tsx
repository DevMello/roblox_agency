import { clsx } from 'clsx'

type Size = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: Size
  className?: string
}

const sizeClasses: Record<Size, { svg: string; stroke: string }> = {
  sm: { svg: 'w-3.5 h-3.5', stroke: '2.5' },
  md: { svg: 'w-5 h-5', stroke: '2' },
  lg: { svg: 'w-8 h-8', stroke: '2' },
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const { svg, stroke } = sizeClasses[size]
  const r = 7
  const circumference = 2 * Math.PI * r

  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={clsx('animate-spin shrink-0', svg, className)}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx="8"
        cy="8"
        r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        opacity={0.2}
      />
      {/* Arc */}
      <circle
        cx="8"
        cy="8"
        r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * 0.75}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
      />
    </svg>
  )
}
