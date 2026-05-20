interface ProgressRingProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  label?: string
  showPct?: boolean
}

export function ProgressRing({
  value,
  max,
  size = 40,
  strokeWidth = 4,
  label,
  showPct = true,
}: ProgressRingProps) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)
  const center = size / 2

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1E1E2E"
          strokeWidth={strokeWidth}
        />
        {/* progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#7C6FFF"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
        {showPct && (
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ transform: 'rotate(90deg)', transformOrigin: `${center}px ${center}px`, fontSize: size * 0.22, fill: '#F0EEF8', fontFamily: 'JetBrains Mono, monospace' }}
          >
            {Math.round(pct * 100)}%
          </text>
        )}
      </svg>
      {label && (
        <span className="text-[10px] text-text-muted font-mono">{label}</span>
      )}
    </div>
  )
}
