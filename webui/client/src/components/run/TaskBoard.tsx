// Stub — full implementation provided by frontend-run-git-components worker
import type { Task } from '../../types'

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  return (
    <div className="p-4 text-text-muted text-sm font-mono">
      {tasks.length} tasks
    </div>
  )
}
