import type { PR } from '../../types'
import { BranchBadge } from './BranchBadge'

interface PRCardProps {
  pr: PR
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

const STATUS_COLOR: Record<PR['state'], string> = {
  OPEN: 'text-success',
  MERGED: 'text-accent',
  CLOSED: 'text-text-muted',
}

export function PRCard({ pr }: PRCardProps) {
  return (
    <div className="border border-border rounded-lg p-3 space-y-2 text-sm bg-surface hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-primary font-medium leading-snug hover:text-accent transition-colors line-clamp-2"
        >
          {pr.title}
        </a>
        <span className={`font-mono text-xs flex-shrink-0 ${STATUS_COLOR[pr.state]}`}>
          #{pr.number}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <BranchBadge name={pr.headRefName} />
        <span className="text-text-muted text-xs">{timeAgo(pr.createdAt)}</span>
      </div>
    </div>
  )
}
