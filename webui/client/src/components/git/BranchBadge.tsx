interface BranchBadgeProps {
  name: string
  isCurrent?: boolean
}

function BranchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-shrink-0">
      <circle cx="4" cy="3" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 5v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 5c0 2 8 1 8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function BranchBadge({ name, isCurrent = false }: BranchBadgeProps) {
  const cls = isCurrent
    ? 'bg-accent/15 text-accent border-accent/30'
    : 'bg-surface text-text-muted border-border'

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono ${cls}`}
      title={name}
    >
      <BranchIcon />
      <span className="max-w-[160px] truncate">{name}</span>
    </span>
  )
}
