// Stub — full implementation provided by frontend-run-git-components worker
import type { Commit } from '../../types'

export function CommitList({ commits }: { commits: Commit[] }) {
  return (
    <div className="space-y-1">
      {commits.map((c) => (
        <div key={c.sha} className="flex gap-2 text-xs font-mono text-text-muted">
          <span className="text-accent">{c.sha.slice(0, 7)}</span>
          <span>{c.message}</span>
        </div>
      ))}
    </div>
  )
}
