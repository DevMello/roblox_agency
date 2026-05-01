// Stub — full implementation provided by frontend-run-git-components worker
import type { PR } from '../../types'

export function PRCard({ pr }: { pr: PR }) {
  return (
    <div className="border border-border rounded-lg p-3 text-sm">
      <span className="font-mono text-text-muted">#{pr.number}</span>{' '}
      <span className="text-text-primary">{pr.title}</span>
    </div>
  )
}
