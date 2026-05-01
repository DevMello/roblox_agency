import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { Game } from '../types'

// ── helpers ──────────────────────────────────────────────────────────────────

function humanize(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface SprintStatusBadgeProps {
  status: string
}

function SprintStatusBadge({ status }: SprintStatusBadgeProps) {
  const lower = (status ?? '').toLowerCase()
  if (lower === 'active' || lower === 'running') {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-success/10 text-success border border-success/30">
        active
      </span>
    )
  }
  if (lower === 'complete' || lower === 'completed') {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-accent/10 text-accent border border-accent/30">
        complete
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-border text-text-muted border border-border">
      {lower || 'idle'}
    </span>
  )
}

interface ProgressBarProps {
  done: number
  total: number
}

function ProgressBar({ done, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-text-muted w-8 text-right">{pct}%</span>
    </div>
  )
}

// ── game card ─────────────────────────────────────────────────────────────────

interface GameCardProps {
  game: Game
}

function GameCard({ game }: GameCardProps) {
  const sprintLabel =
    game.current_sprint != null ? `Sprint ${game.current_sprint}` : 'No sprint'

  // Derive a display status from available data
  const sprintStatus = (() => {
    if (game.open_pr_count > 0) return 'active'
    if (game.tasks_done === game.task_count && game.task_count > 0) return 'complete'
    return 'idle'
  })()

  return (
    <Link
      to={`/projects/${game.slug}`}
      className="block bg-surface border border-border rounded-lg p-4 hover:border-accent/40 transition-colors group"
    >
      {/* header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-text-primary font-body font-semibold text-sm truncate group-hover:text-accent transition-colors">
            {humanize(game.name)}
          </h3>
          <p className="text-text-muted font-mono text-xs mt-0.5 truncate">{game.slug}</p>
        </div>
        <SprintStatusBadge status={sprintStatus} />
      </div>

      {/* progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-muted font-body">Tasks</span>
          <span className="text-xs font-mono text-text-muted">
            {game.tasks_done}/{game.task_count}
          </span>
        </div>
        <ProgressBar done={game.tasks_done} total={game.task_count} />
      </div>

      {/* footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs font-mono text-accent/70">{sprintLabel}</span>
        {game.blocker_count > 0 && (
          <span className="flex items-center gap-1 text-xs font-mono text-danger">
            <span>⚠</span>
            {game.blocker_count} blocker{game.blocker_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </Link>
  )
}

// ── empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-6xl mb-4">🎮</span>
      <h2 className="text-text-primary font-display font-bold text-xl mb-2">No games yet</h2>
      <p className="text-text-muted font-body text-sm mb-6">
        Create a spec to kick off the first night cycle.
      </p>
      <Link
        to="/new"
        className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors"
      >
        + New Game
      </Link>
    </div>
  )
}

// ── sidebar ───────────────────────────────────────────────────────────────────

interface DirsResponse {
  files: Array<{ name: string; path: string; type: string }>
}

interface ScheduleResponse {
  upcoming: Array<{ id: string; label: string; next_run: string; script: string }>
}

function RightSidebar() {
  const { data: dirsData } = useQuery<DirsResponse>({
    queryKey: ['dirs', 'reports/morning'],
    queryFn: () =>
      fetch('/api/v1/dirs/reports/morning').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch morning reports')
        return r.json()
      }),
    refetchInterval: 60_000,
  })

  const { data: scheduleData } = useQuery<ScheduleResponse>({
    queryKey: ['schedule', 'upcoming', 3],
    queryFn: () =>
      fetch('/api/v1/schedule/upcoming?n=3').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch schedule')
        return r.json()
      }),
    refetchInterval: 60_000,
  })

  const reports = (dirsData?.files ?? [])
    .filter((f) => f.name.endsWith('.md'))
    .slice(-5)
    .reverse()

  const upcoming = scheduleData?.upcoming ?? []

  async function triggerMorningReport() {
    try {
      const res = await fetch('/api/v1/runs/morning-report', { method: 'POST' })
      if (res.ok) {
        alert('Morning report run queued successfully.')
      } else {
        const text = await res.text()
        alert(`Failed to queue morning report: ${text}`)
      }
    } catch (err) {
      alert(`Error: ${String(err)}`)
    }
  }

  return (
    <aside className="w-1/4 shrink-0 flex flex-col gap-6">
      {/* morning reports */}
      <section className="bg-surface border border-border rounded-lg p-4">
        <h2 className="text-text-primary font-display font-semibold text-sm mb-3">
          Morning Reports
        </h2>
        {reports.length === 0 ? (
          <p className="text-text-muted font-body text-xs">No reports yet.</p>
        ) : (
          <ul className="space-y-1">
            {reports.map((f) => (
              <li key={f.name}>
                <Link
                  to={`/repo/reports/morning/${f.name}`}
                  className="text-xs font-mono text-accent hover:text-accent/70 transition-colors truncate block"
                >
                  {f.name.replace(/\.md$/, '')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* upcoming schedule */}
      <section className="bg-surface border border-border rounded-lg p-4">
        <h2 className="text-text-primary font-display font-semibold text-sm mb-3">
          Upcoming Runs
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-text-muted font-body text-xs">No scheduled runs.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((job) => (
              <li key={job.id} className="flex flex-col gap-0.5">
                <span className="text-xs text-text-primary font-body font-medium truncate">
                  {job.label}
                </span>
                <span className="text-xs font-mono text-text-muted">{job.next_run}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* quick actions */}
      <section className="bg-surface border border-border rounded-lg p-4">
        <h2 className="text-text-primary font-display font-semibold text-sm mb-3">
          Quick Actions
        </h2>
        <button
          onClick={triggerMorningReport}
          className="w-full px-3 py-2 rounded bg-accent/10 text-accent border border-accent/30 text-xs font-semibold font-mono hover:bg-accent/20 transition-colors text-left"
        >
          Run Morning Report
        </button>
      </section>
    </aside>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Projects() {
  const { data, isLoading, isError } = useQuery<Game[]>({
    queryKey: ['games'],
    queryFn: () =>
      fetch('/api/v1/games/').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch games')
        return r.json()
      }),
    refetchInterval: 30_000,
  })

  const games = data ?? []

  return (
    <div className="flex flex-col h-full">
      {/* sticky top bar */}
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-text-primary font-display font-bold text-lg">Projects</h1>
          {!isLoading && !isError && (
            <span className="px-2 py-0.5 rounded-full bg-border text-text-muted text-xs font-mono">
              {games.length}
            </span>
          )}
        </div>
        <Link
          to="/new"
          className="px-3 py-1.5 rounded bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors"
        >
          + New Game
        </Link>
      </div>

      {/* body */}
      <div className="flex-1 flex gap-6 p-6 overflow-auto">
        {/* main grid — 3/4 width */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-text-muted font-mono text-sm">
              Loading…
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-24 text-danger font-mono text-sm">
              Failed to load games.
            </div>
          ) : games.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {games.map((g) => (
                <GameCard key={g.slug} game={g} />
              ))}
            </div>
          )}
        </div>

        {/* right sidebar — 1/4 width */}
        <RightSidebar />
      </div>
    </div>
  )
}
