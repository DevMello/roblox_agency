import type { Commit } from '../../types'

interface CommitListProps {
  commits: Commit[]
  limit?: number
}

export function CommitList({ commits, limit = 10 }: CommitListProps) {
  const visible = commits.slice(0, limit)

  return (
    <div className="space-y-0.5">
      {visible.map((c) => (
        <div key={c.sha} className="flex items-center gap-3 py-1 px-2 rounded text-xs hover:bg-surface/60">
          <span className="text-accent font-mono w-14 flex-shrink-0">{c.sha.slice(0, 7)}</span>
          <span className="text-text-primary flex-1 truncate">{c.message}</span>
          <span className="text-text-muted font-mono hidden sm:block flex-shrink-0">{c.author}</span>
        </div>
      ))}
      {commits.length > limit && (
        <div className="text-text-muted text-[10px] font-mono px-2 py-1">
          +{commits.length - limit} more
        </div>
      )}
    </div>
  )
}
