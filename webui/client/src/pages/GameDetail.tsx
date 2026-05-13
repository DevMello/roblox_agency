import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useGame } from '../hooks/useGames'
import { ROUTES } from '../router'

type TabId = 'overview' | 'sprint' | 'plan' | 'progress' | 'overrides' | 'blockers'

// ── Status badge helpers ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  done: 'bg-green-900/40 text-green-400 border-green-700/40',
  approved: 'bg-green-900/40 text-green-400 border-green-700/40',
  complete: 'bg-green-900/40 text-green-400 border-green-700/40',
  active: 'bg-blue-900/40 text-blue-400 border-blue-700/40',
  planned: 'bg-blue-900/40 text-blue-400 border-blue-700/40',
  'in-progress': 'bg-blue-900/40 text-blue-400 border-blue-700/40',
  pending: 'bg-surface text-text-muted border-border',
  failed: 'bg-red-900/40 text-red-400 border-red-700/40',
  blocked: 'bg-orange-900/40 text-orange-400 border-orange-700/40',
  open: 'bg-red-900/40 text-red-400 border-red-700/40',
  superseded: 'bg-surface text-text-muted border-border',
  rejected: 'bg-red-900/40 text-red-400 border-red-700/40',
  expired: 'bg-surface text-text-muted border-border',
}

const TYPE_COLORS: Record<string, string> = {
  scripting: 'bg-purple-900/30 text-purple-300',
  'game-mechanic': 'bg-blue-900/30 text-blue-300',
  ui: 'bg-pink-900/30 text-pink-300',
  data: 'bg-yellow-900/30 text-yellow-300',
  config: 'bg-gray-700/50 text-gray-300',
  asset: 'bg-amber-900/30 text-amber-300',
  'live-edit': 'bg-orange-900/30 text-orange-300',
  'design-decision': 'bg-blue-900/30 text-blue-300',
  'feature-block': 'bg-red-900/30 text-red-300',
  'feature-require': 'bg-green-900/30 text-green-300',
  'cost-cap-override': 'bg-yellow-900/30 text-yellow-300',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status?.toLowerCase()] ?? 'bg-surface text-text-muted border-border'
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-mono font-semibold ${cls}`}>
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_COLORS[type?.toLowerCase()] ?? 'bg-gray-700/50 text-gray-300'
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${cls}`}>
      {type}
    </span>
  )
}

// ── Sprint Log Tab ────────────────────────────────────────────────────────────

interface SprintTask {
  task_id: string
  title: string
  type: string
  description: string
  estimated_minutes?: number
  status: string
  attempt_count: number
  pr_reference?: string
  qa_verdict?: string
  qa_notes?: string
  depends_on: string[]
}

interface SprintData {
  sprint_id?: string
  date?: string
  game_name?: string
  milestone_ref?: string
  status: string
  total_estimated_minutes?: number
  tasks: SprintTask[]
  notes: Array<{ timestamp: string; type: string; message: string }>
  raw: string
}

function SprintTab({ data }: { data: SprintData }) {
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const statuses = ['all', ...Array.from(new Set(data.tasks.map(t => t.status))).sort()]
  const filtered = filter === 'all' ? data.tasks : data.tasks.filter(t => t.status === filter)

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  if (!data.tasks.length) {
    return (
      <div className="p-6">
        <div className="text-text-muted font-mono text-sm italic">No sprint tasks yet.</div>
        <div className="mt-4 text-xs text-text-muted">
          Sprint ID: {data.sprint_id ?? '—'} · Status: {data.status}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      {/* Header meta */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge status={data.status} />
        {data.sprint_id && (
          <span className="font-mono text-text-muted text-xs">{data.sprint_id}</span>
        )}
        {data.date && (
          <span className="text-text-muted text-xs">{data.date}</span>
        )}
        {data.total_estimated_minutes && (
          <span className="text-text-muted text-xs">
            ~{Math.round(data.total_estimated_minutes / 60)}h estimated
          </span>
        )}
        <span className="text-text-muted text-xs ml-auto">
          {data.tasks.filter(t => t.status === 'done').length}/{data.tasks.length} done
        </span>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filter === s
                ? 'bg-accent text-white'
                : 'bg-surface border border-border text-text-muted hover:text-text-primary'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div className="space-y-2">
        {filtered.map(task => {
          const open = expanded.has(task.task_id)
          return (
            <div key={task.task_id} className="bg-surface border border-border rounded-lg overflow-hidden">
              {/* Task row */}
              <button
                onClick={() => toggle(task.task_id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-border/30 transition-colors"
              >
                <span className="font-mono text-xs text-text-muted w-20 shrink-0">{task.task_id}</span>
                <span className="flex-1 text-sm text-text-primary font-medium truncate">{task.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {task.type && <TypeBadge type={task.type} />}
                  <StatusBadge status={task.status} />
                  {task.qa_verdict && task.qa_verdict !== task.status && (
                    <span className="text-xs font-mono text-text-muted">QA: <StatusBadge status={task.qa_verdict} /></span>
                  )}
                  {task.estimated_minutes && (
                    <span className="text-xs text-text-muted font-mono">{task.estimated_minutes}m</span>
                  )}
                  <span className="text-text-muted ml-1">{open ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {open && (
                <div className="border-t border-border px-4 py-3 space-y-3 bg-bg/40">
                  {task.description && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-text-muted font-mono">
                    {task.attempt_count > 0 && (
                      <span>Attempts: {task.attempt_count}</span>
                    )}
                    {task.depends_on.length > 0 && (
                      <span>Depends on: {task.depends_on.join(', ')}</span>
                    )}
                    {task.pr_reference && (
                      <a
                        href={task.pr_reference.startsWith('http') ? task.pr_reference : undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        PR: {task.pr_reference}
                      </a>
                    )}
                  </div>

                  {task.qa_notes && (
                    <div className="bg-orange-900/10 border border-orange-700/30 rounded p-3">
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-1">QA Notes</p>
                      <p className="text-xs text-text-primary whitespace-pre-wrap font-mono">
                        {task.qa_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Planner notes */}
      {data.notes.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-text-primary">
            {data.notes.length} planner note{data.notes.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2">
            {data.notes.map((n, i) => (
              <div key={i} className="bg-surface border border-border rounded px-3 py-2">
                <p className="text-xs font-mono text-text-muted mb-1">{n.timestamp} · {n.type}</p>
                <p className="text-xs text-text-primary whitespace-pre-wrap">{n.message}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── Plan Tab ──────────────────────────────────────────────────────────────────

interface Milestone {
  id: string
  title: string
  short_title: string
  goal: string
  estimated_nights: string
  actual_nights: string
  status: string
  critical_path: string
  task_ids: string[]
  success_criteria: string[]
}

interface PlanData {
  milestones: Milestone[]
  task_index: Array<Record<string, string>>
  dependency_table: Array<Record<string, string>>
  status_text: string
  raw: string
}

function PlanTab({ data }: { data: PlanData }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'milestones' | 'tasks'>('milestones')

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const milestoneStatusOrder = ['in-progress', 'active', 'pending', 'complete']
  const sorted = [...data.milestones].sort(
    (a, b) => milestoneStatusOrder.indexOf(a.status) - milestoneStatusOrder.indexOf(b.status)
  )

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex gap-3">
          <span className="text-text-muted">Milestones:</span>
          <span className="text-green-400 font-mono">
            {data.milestones.filter(m => m.status === 'complete').length} complete
          </span>
          <span className="text-text-muted font-mono">
            / {data.milestones.length} total
          </span>
        </div>
        <div className="flex gap-2 ml-auto">
          {(['milestones', 'tasks'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                view === v ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:text-text-primary'
              }`}
            >
              {v === 'milestones' ? 'Milestones' : 'Task Index'}
            </button>
          ))}
        </div>
      </div>

      {view === 'milestones' && (
        <div className="space-y-2">
          {sorted.map(ms => {
            const open = expanded.has(ms.id)
            return (
              <div key={ms.id} className="bg-surface border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggle(ms.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-border/30 transition-colors"
                >
                  <span className="font-mono text-xs text-text-muted w-8 shrink-0">{ms.id}</span>
                  <span className="flex-1 text-sm text-text-primary font-medium">{ms.short_title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {ms.critical_path?.toLowerCase().startsWith('yes') && (
                      <span className="text-xs bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-mono">critical</span>
                    )}
                    <StatusBadge status={ms.status} />
                    <span className="text-xs text-text-muted font-mono">{ms.task_ids.length} tasks</span>
                    <span className="text-text-muted ml-1">{open ? '▲' : '▼'}</span>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-border px-4 py-3 space-y-3 bg-bg/40">
                    {ms.goal && (
                      <div>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Goal</p>
                        <p className="text-sm text-text-primary">{ms.goal}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-text-muted font-mono">
                      <span>Estimated: {ms.estimated_nights} night{ms.estimated_nights !== '1' ? 's' : ''}</span>
                      <span>Actual: {ms.actual_nights || '0'} nights</span>
                      {ms.task_ids.length > 0 && (
                        <span>Tasks: {ms.task_ids.join(', ')}</span>
                      )}
                    </div>

                    {ms.success_criteria.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Success criteria</p>
                        <ul className="space-y-1">
                          {ms.success_criteria.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'tasks' && data.task_index.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-surface border-b border-border">
                {Object.keys(data.task_index[0]).map(h => (
                  <th key={h} className="px-3 py-2 text-left text-text-muted font-semibold uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.task_index.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-3 py-2 text-text-primary whitespace-nowrap">
                      {j === Object.values(row).length - 1 && val !== '—' ? (
                        <StatusBadge status={val} />
                      ) : (
                        val
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'tasks' && data.task_index.length === 0 && (
        <div className="text-text-muted font-mono text-sm italic">No task index found.</div>
      )}
    </div>
  )
}

// ── Progress Tab ──────────────────────────────────────────────────────────────

interface ProgressEntry {
  date: string
  task_id: string
  title: string
  pr: string
  pr_url: string
  status: string
  notes: string
}

interface ProgressData {
  entries: ProgressEntry[]
  raw: string
}

function ProgressTab({ data }: { data: ProgressData }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const filtered = data.entries.filter(e =>
    !search ||
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.task_id.toLowerCase().includes(search.toLowerCase()) ||
    e.notes.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (i: number) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  if (data.entries.length === 0) {
    return (
      <div className="p-6 text-text-muted font-mono text-sm italic">No progress entries yet.</div>
    )
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search entries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-surface border border-border rounded text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
        />
        <span className="text-xs text-text-muted font-mono whitespace-nowrap">
          {filtered.length} / {data.entries.length} entries
        </span>
      </div>

      <div className="space-y-2">
        {filtered.map((entry, i) => {
          const open = expanded.has(i)
          return (
            <div key={i} className="bg-surface border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(i)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-border/30 transition-colors"
              >
                <span className="font-mono text-xs text-text-muted w-24 shrink-0">{entry.date}</span>
                <span className="font-mono text-xs text-accent w-16 shrink-0">{entry.task_id}</span>
                <span className="flex-1 text-sm text-text-primary truncate">{entry.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.pr && (
                    <span className="text-xs font-mono text-text-muted">PR #{entry.pr}</span>
                  )}
                  <StatusBadge status={entry.status} />
                  <span className="text-text-muted ml-1">{open ? '▲' : '▼'}</span>
                </div>
              </button>

              {open && entry.notes && (
                <div className="border-t border-border px-4 py-3 bg-bg/40">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Notes</p>
                    {entry.pr_url && (
                      <a
                        href={entry.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent hover:underline font-mono"
                      >
                        View PR →
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
                    {entry.notes}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Overrides Tab ─────────────────────────────────────────────────────────────

interface OverrideEntry {
  id: string
  timestamp: string
  game: string
  type: string
  description: string
  status: string
  request: string
  applied_by: string
  requested_by: string
}

interface OverridesData {
  entries: OverrideEntry[]
  filtered: boolean
  raw: string
}

function OverridesTab({ data }: { data: OverridesData }) {
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const statuses = ['all', ...Array.from(new Set(data.entries.map(e => e.status))).filter(Boolean).sort()]
  const filtered = filter === 'all' ? data.entries : data.entries.filter(e => e.status === filter)

  const toggle = (i: number) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })

  if (data.entries.length === 0) {
    return (
      <div className="p-6 text-text-muted font-mono text-sm italic">No overrides recorded yet.</div>
    )
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {!data.filtered && (
        <div className="bg-blue-900/20 border border-blue-700/30 rounded px-3 py-2 text-xs text-blue-300">
          Showing all overrides (none specific to this game yet)
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filter === s
                ? 'bg-accent text-white'
                : 'bg-surface border border-border text-text-muted hover:text-text-primary'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((entry, i) => {
          const open = expanded.has(i)
          const isActive = entry.status?.toLowerCase() === 'active'
          return (
            <div
              key={i}
              className={`bg-surface border rounded-lg overflow-hidden ${
                isActive ? 'border-accent/40' : 'border-border'
              }`}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-border/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text-primary font-medium truncate">
                      {entry.description || entry.id || 'Override'}
                    </span>
                    {entry.game && (
                      <span className="text-xs font-mono text-text-muted">{entry.game}</span>
                    )}
                  </div>
                  {entry.timestamp && (
                    <p className="text-xs text-text-muted font-mono mt-0.5">{entry.timestamp}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.type && <TypeBadge type={entry.type} />}
                  <StatusBadge status={entry.status || 'active'} />
                  <span className="text-text-muted ml-1">{open ? '▲' : '▼'}</span>
                </div>
              </button>

              {open && (
                <div className="border-t border-border px-4 py-3 space-y-3 bg-bg/40">
                  {entry.request && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Request</p>
                      <p className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
                        {entry.request}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-text-muted font-mono">
                    {entry.id && <span>ID: {entry.id}</span>}
                    {entry.requested_by && <span>Requested by: {entry.requested_by}</span>}
                    {entry.applied_by && <span>Applied by: {entry.applied_by}</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Blockers Tab ──────────────────────────────────────────────────────────────

interface Blocker {
  id: string
  title: string
  status: string
  game: string
  description: string
}

function BlockersTab({ blockers }: { blockers: Blocker[] }) {
  if (!blockers.length) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-green-400 text-sm font-mono">
          <span>✓</span>
          <span>No open blockers</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl space-y-3">
      {blockers.map(blocker => (
        <div key={blocker.id} className="bg-surface border border-danger/30 rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-text-primary font-semibold text-sm">{blocker.title}</h3>
              <p className="text-text-muted font-mono text-xs mt-0.5">{blocker.id}</p>
            </div>
            <StatusBadge status={blocker.status} />
          </div>
          {blocker.description && (
            <p className="text-xs text-text-muted leading-relaxed">{blocker.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ gameState, gameSlug }: { gameState: any; gameSlug: string }) {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <section>
        <h2 className="text-text-primary font-semibold mb-3">Summary</h2>
        <div className="bg-surface border border-border rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Slug:</span>
            <span className="font-mono text-text-primary">{gameState.slug}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Current Sprint:</span>
            <span className="font-mono text-text-primary">
              {gameState.current_sprint ?? 'None'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Tasks Completed:</span>
            <span className="font-mono text-accent">
              {gameState.tasks_done} / {gameState.task_count}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Milestones:</span>
            <span className="font-mono text-text-primary">
              {gameState.milestones_done} / {gameState.milestone_count}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Open PRs:</span>
            <span className="font-mono text-text-primary">{gameState.open_pr_count}</span>
          </div>
          {gameState.blocker_count > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Blockers:</span>
              <span className="font-mono text-danger">{gameState.blocker_count}</span>
            </div>
          )}
          {gameState.last_run_at && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Last Run:</span>
              <span className="font-mono text-text-primary">
                {new Date(gameState.last_run_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </section>

      {gameState.plan_milestones?.length > 0 && (
        <section>
          <h2 className="text-text-primary font-semibold mb-3">Milestones</h2>
          <div className="space-y-2">
            {gameState.plan_milestones.map((ms: any) => (
              <div key={ms.title} className="flex items-center gap-3 bg-surface border border-border rounded px-3 py-2">
                <StatusBadge status={ms.status} />
                <span className="text-sm text-text-primary">{ms.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-text-primary font-semibold mb-3">Actions</h2>
        <div className="flex gap-2">
          <Link
            to={ROUTES.run(gameSlug)}
            className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors"
          >
            Start Sprint Run
          </Link>
          <Link
            to={ROUTES.edit(gameSlug)}
            className="px-4 py-2 rounded bg-surface border border-border text-text-primary text-sm font-semibold hover:bg-border transition-colors"
          >
            Live Edit
          </Link>
          <Link
            to={ROUTES.gameRepo(gameSlug)}
            className="px-4 py-2 rounded bg-surface border border-border text-text-primary text-sm font-semibold hover:bg-border transition-colors"
          >
            View Repo
          </Link>
        </div>
      </section>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GameDetail() {
  const { game: gameSlug } = useParams<{ game: string }>()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  if (!gameSlug) {
    return <div className="p-8 text-danger">Missing game parameter</div>
  }

  const { data: gameState, isLoading: stateLoading, error: stateError } = useGame(gameSlug)

  const { data: sprintData, isLoading: sprintLoading } = useQuery<SprintData>({
    queryKey: ['game', gameSlug, 'sprint'],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/sprint-log`).then(r => r.json()),
    enabled: activeTab === 'sprint',
  })

  const { data: planData, isLoading: planLoading } = useQuery<PlanData>({
    queryKey: ['game', gameSlug, 'plan'],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/plan`).then(r => r.json()),
    enabled: activeTab === 'plan',
  })

  const { data: progressData, isLoading: progressLoading } = useQuery<ProgressData>({
    queryKey: ['game', gameSlug, 'progress'],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/progress`).then(r => r.json()),
    enabled: activeTab === 'progress',
  })

  const { data: overridesData, isLoading: overridesLoading } = useQuery<OverridesData>({
    queryKey: ['game', gameSlug, 'overrides'],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/overrides`).then(r => r.json()),
    enabled: activeTab === 'overrides',
  })

  const { data: blockersData, isLoading: blockersLoading } = useQuery<Blocker[]>({
    queryKey: ['game', gameSlug, 'blockers'],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/blockers`).then(r => r.json()),
    enabled: activeTab === 'blockers',
  })

  if (stateLoading) {
    return <div className="p-8 text-text-muted font-mono text-sm">Loading game...</div>
  }

  if (stateError || !gameState) {
    return (
      <div className="p-8">
        <div className="mb-4">
          <Link to={ROUTES.projects} className="text-accent hover:underline">
            ← Back to Projects
          </Link>
        </div>
        <div className="text-danger font-mono text-sm">Game not found or failed to load</div>
      </div>
    )
  }

  function humanize(slug: string): string {
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'sprint', label: 'Sprint Log', count: gameState.task_count || undefined },
    { id: 'plan', label: 'Plan', count: gameState.milestone_count || undefined },
    { id: 'progress', label: 'Progress' },
    { id: 'overrides', label: 'Overrides' },
    { id: 'blockers', label: 'Blockers', count: gameState.blocker_count || undefined },
  ]

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={ROUTES.projects} className="text-accent hover:text-accent/80">
              ← Projects
            </Link>
            <h1 className="text-text-primary font-display font-bold text-2xl">
              {humanize(gameState.name || gameSlug)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.run(gameSlug)}
              className="px-3 py-1.5 rounded bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors"
            >
              Run Sprint
            </Link>
            <Link
              to={ROUTES.edit(gameSlug)}
              className="px-3 py-1.5 rounded bg-surface border border-border text-text-primary text-xs font-semibold hover:bg-border transition-colors"
            >
              Live Edit
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'text-accent border-accent'
                  : 'text-text-muted border-transparent hover:text-text-primary'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === tab.id ? 'bg-accent/20 text-accent' : 'bg-surface text-text-muted'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && <OverviewTab gameState={gameState} gameSlug={gameSlug} />}

        {activeTab === 'sprint' && (
          sprintLoading
            ? <div className="p-6 text-text-muted font-mono text-sm">Loading sprint log...</div>
            : sprintData
              ? <SprintTab data={sprintData} />
              : <div className="p-6 text-text-muted font-mono text-sm italic">No sprint log yet.</div>
        )}

        {activeTab === 'plan' && (
          planLoading
            ? <div className="p-6 text-text-muted font-mono text-sm">Loading plan...</div>
            : planData
              ? <PlanTab data={planData} />
              : <div className="p-6 text-text-muted font-mono text-sm italic">No plan yet.</div>
        )}

        {activeTab === 'progress' && (
          progressLoading
            ? <div className="p-6 text-text-muted font-mono text-sm">Loading progress log...</div>
            : progressData
              ? <ProgressTab data={progressData} />
              : <div className="p-6 text-text-muted font-mono text-sm italic">No progress log yet.</div>
        )}

        {activeTab === 'overrides' && (
          overridesLoading
            ? <div className="p-6 text-text-muted font-mono text-sm">Loading overrides...</div>
            : overridesData
              ? <OverridesTab data={overridesData} />
              : <div className="p-6 text-text-muted font-mono text-sm italic">No overrides.</div>
        )}

        {activeTab === 'blockers' && (
          blockersLoading
            ? <div className="p-6 text-text-muted font-mono text-sm">Loading blockers...</div>
            : <BlockersTab blockers={blockersData ?? []} />
        )}
      </div>
    </div>
  )
}
