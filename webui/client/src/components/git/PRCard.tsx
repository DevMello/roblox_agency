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

const STATUS_COLOR: Record<PR['status'], string> = {
  open:   'text-success',
  merged: 'text-accent',
  closed: 'text-text-muted',
}

export function PRCard({ pr }: PRCardProps) {
  return (
    <div className="border border-border rounded-lg p-3 space-y-2 text-sm bg-surface hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <a
          href={pr.diff_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-primary font-medium leading-snug hover:text-accent transition-colors line-clamp-2"
        >
          {pr.title}
        </a>
        <span className={`font-mono text-xs flex-shrink-0 ${STATUS_COLOR[pr.status]}`}>
          #{pr.number}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <BranchBadge name={pr.branch} />
        <span className="text-text-muted text-xs">{timeAgo(pr.created_at)}</span>
        {pr.qa_verdict && (
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${pr.qa_verdict === 'approved' ? 'text-success border-success/30 bg-success/10' : 'text-danger border-danger/30 bg-danger/10'}`}>
            qa:{pr.qa_verdict}
          </span>
        )}
      </div>

      {pr.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pr.labels.map((lbl) => (
            <span key={lbl} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-border/60 text-text-muted">
              {lbl}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
