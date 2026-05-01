import type { Task, TaskStatus } from '../../types'

interface TaskBoardProps {
  tasks: Task[]
  compact?: boolean
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  pending:     { label: 'Pending',     color: 'text-text-muted border-border bg-surface',         dot: 'bg-text-muted' },
  running:   { label: 'In Progress',  color: 'text-accent border-accent/30 bg-accent/10',          dot: 'bg-accent' },
  done:       { label: 'Done',         color: 'text-success border-success/30 bg-success/10',       dot: 'bg-success' },
  failed:     { label: 'Failed',       color: 'text-danger border-danger/30 bg-danger/10',          dot: 'bg-danger' },
  blocked:    { label: 'Blocked',      color: 'text-warning border-warning/30 bg-warning/10',       dot: 'bg-warning' },
}

const COLUMNS: TaskStatus[] = ['pending', 'running', 'done', 'failed', 'blocked']

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3 space-y-2 text-xs">
      <div className="text-text-primary font-medium leading-snug">{task.title}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={task.status} />
        {task.worker_id && (
          <span className="text-text-muted font-mono">{task.worker_id}</span>
        )}
        {task.pr_number && (
          <span className="text-accent font-mono">#{task.pr_number}</span>
        )}
      </div>
    </div>
  )
}

export function TaskBoard({ tasks, compact = false }: TaskBoardProps) {
  if (compact) {
    return (
      <div className="space-y-1">
        {tasks.map((task) => {
          const cfg = STATUS_CONFIG[task.status]
          return (
            <div key={task.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-surface/60 text-xs">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className="text-text-primary flex-1 truncate">{task.title}</span>
              {task.worker_id && (
                <span className="text-text-muted font-mono text-[10px]">{task.worker_id}</span>
              )}
              {task.pr_number && (
                <span className="text-accent font-mono text-[10px]">#{task.pr_number}</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-5 gap-3 min-w-0">
      {COLUMNS.map((status) => {
        const col = tasks.filter((t) => t.status === status)
        const cfg = STATUS_CONFIG[status]
        return (
          <div key={status} className="flex flex-col gap-2 min-w-0">
            <div className={`flex items-center gap-1.5 text-[11px] font-mono pb-1 border-b border-border ${cfg.color.split(' ')[0]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              <span>{cfg.label}</span>
              <span className="ml-auto text-text-muted">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
