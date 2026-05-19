type Size = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: Size
  className?: string
}

const sizePx: Record<Size, number> = {
  sm: 14,
  md: 20,
  lg: 32,
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const px = sizePx[size]

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ animation: 'spin 1.6s cubic-bezier(0.5,0,0.5,1) infinite', flexShrink: 0 }}
    >
      {/* Snapblox cube / diamond mark — two rotated squares */}
      <rect
        x="10"
        y="10"
        width="12"
        height="12"
        rx="2"
        fill="var(--accent)"
        opacity="0.9"
        transform="rotate(45 16 16)"
      />
      <rect
        x="12"
        y="12"
        width="8"
        height="8"
        rx="1.5"
        fill="var(--bg)"
        opacity="0.7"
        transform="rotate(45 16 16)"
      />
    </svg>
  )
}
