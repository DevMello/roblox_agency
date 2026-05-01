import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledJob {
  id: string
  label: string
  game: string
  script: string
  cron_expr: string
  timezone: string
  active: boolean
  next_run: string
  last_run: string | null
  last_run_status: 'ok' | 'failed' | null
}

interface UpcomingJob {
  id: string
  label: string
  next_run: string
  game: string
  script: string
}

interface Game {
  name: string
  slug: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCRIPT_OPTIONS = [
  'night-cycle',
  'architect',
  'reporter',
  'live-edit',
  'worker',
  'weekly-research',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-success' : 'bg-text-muted'}`}
      title={active ? 'Active' : 'Paused'}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Schedule() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingJob[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Add form state
  const [newLabel, setNewLabel] = useState('')
  const [newGame, setNewGame] = useState('')
  const [newScript, setNewScript] = useState(SCRIPT_OPTIONS[0])
  const [newCron, setNewCron] = useState('0 23 * * *')
  const [adding, setAdding] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [jobsRes, upcomingRes, gamesRes] = await Promise.all([
        fetch('/api/v1/schedule/'),
        fetch('/api/v1/schedule/upcoming?n=5'),
        fetch('/api/v1/games/'),
      ])
      if (jobsRes.ok) setJobs(await jobsRes.json())
      if (upcomingRes.ok) setUpcoming(await upcomingRes.json())
      if (gamesRes.ok) setGames(await gamesRes.json())
    } catch {
      setError('Failed to load schedule data')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function flash(text: string, ok: boolean) {
    setActionMsg({ text, ok })
    setTimeout(() => setActionMsg(null), 3000)
  }

  async function handlePause(id: string) {
    const res = await fetch(`/api/v1/schedule/${id}/pause`, { method: 'POST' })
    if (res.ok) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, active: false } : j))
      flash('Job paused', true)
    } else {
      flash('Failed to pause job', false)
    }
  }

  async function handleResume(id: string) {
    const res = await fetch(`/api/v1/schedule/${id}/resume`, { method: 'POST' })
    if (res.ok) {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, active: true } : j))
      flash('Job resumed', true)
    } else {
      flash('Failed to resume job', false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this scheduled job?')) return
    const res = await fetch(`/api/v1/schedule/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setJobs(prev => prev.filter(j => j.id !== id))
      flash('Job deleted', true)
    } else {
      flash('Failed to delete job', false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const res = await fetch('/api/v1/schedule/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: newLabel,
        game: newGame,
        script: newScript,
        cron_expr: newCron,
      }),
    })
    if (res.ok) {
      flash('Job added', true)
      setShowAddForm(false)
      setNewLabel('')
      setNewGame('')
      setNewScript(SCRIPT_OPTIONS[0])
      setNewCron('0 23 * * *')
      await fetchAll()
    } else {
      flash('Failed to add job', false)
    }
    setAdding(false)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-display font-semibold text-text-primary">Schedule</h1>
        <div className="flex items-center gap-3">
          {actionMsg && (
            <span className={`text-xs font-mono ${actionMsg.ok ? 'text-success' : 'text-danger'}`}>
              {actionMsg.text}
            </span>
          )}
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="px-3 py-1.5 text-sm rounded bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Job'}
          </button>
        </div>
      </div>

      {/* Add Job Form */}
      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="bg-surface border border-border rounded-lg p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <h2 className="col-span-full text-sm font-semibold text-text-primary mb-1">New Scheduled Job</h2>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Label</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              required
              placeholder="Nightly build"
              className="bg-bg border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/60"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Game</label>
            <select
              value={newGame}
              onChange={e => setNewGame(e.target.value)}
              className="bg-bg border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/60"
            >
              <option value="">— all games —</option>
              {games.map(g => (
                <option key={g.slug} value={g.slug}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Script</label>
            <select
              value={newScript}
              onChange={e => setNewScript(e.target.value)}
              className="bg-bg border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/60"
            >
              {SCRIPT_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Cron Expression</label>
            <input
              value={newCron}
              onChange={e => setNewCron(e.target.value)}
              required
              placeholder="0 23 * * *"
              className="bg-bg border border-border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent/60"
            />
            <span className="text-xs text-text-muted">e.g. <code className="font-mono text-accent">0 23 * * *</code> = 11 PM daily</span>
          </div>

          <div className="col-span-full flex justify-end">
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 text-sm rounded bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add Job'}
            </button>
          </div>
        </form>
      )}

      {/* Upcoming panel */}
      {upcoming.length > 0 && (
        <div className="mb-6 bg-surface border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Upcoming (next 5)</h2>
          <div className="space-y-2">
            {upcoming.map(job => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-text-primary">{job.label}</span>
                  {job.game && (
                    <span className="badge badge-pending">{job.game}</span>
                  )}
                  <span className="text-text-muted text-xs font-mono">{job.script}</span>
                </div>
                <span className="text-text-muted text-xs font-mono">{formatDate(job.next_run)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs table */}
      {loading ? (
        <div className="bg-surface border border-border rounded-lg p-8 text-text-muted text-sm font-mono">
          Loading…
        </div>
      ) : error ? (
        <div className="bg-surface border border-border rounded-lg p-8 text-danger text-sm font-mono">
          {error}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted text-sm">
          No scheduled jobs yet. Click "Add Job" to create one.
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-text-muted font-medium px-4 py-3 w-8"></th>
                <th className="text-left text-text-muted font-medium px-4 py-3">Label</th>
                <th className="text-left text-text-muted font-medium px-4 py-3">Game</th>
                <th className="text-left text-text-muted font-medium px-4 py-3">Script</th>
                <th className="text-left text-text-muted font-medium px-4 py-3">Cron</th>
                <th className="text-left text-text-muted font-medium px-4 py-3">Next Run</th>
                <th className="text-left text-text-muted font-medium px-4 py-3 w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} className="border-b border-border hover:bg-border/20 transition-colors">
                  <td className="px-4 py-3">
                    <StatusDot active={job.active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-text-primary">{job.label}</div>
                    {job.last_run && (
                      <div className="text-xs text-text-muted mt-0.5">
                        Last: {formatDate(job.last_run)}{' '}
                        {job.last_run_status === 'ok' && <span className="text-success">✓</span>}
                        {job.last_run_status === 'failed' && <span className="text-danger">✗</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs font-mono">
                    {job.game || '—'}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs font-mono">
                    {job.script}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs font-mono">
                    {job.cron_expr}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {formatDate(job.next_run)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {job.active ? (
                        <button
                          onClick={() => handlePause(job.id)}
                          className="px-2 py-1 text-xs rounded bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30 transition-colors"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => handleResume(job.id)}
                          className="px-2 py-1 text-xs rounded bg-success/20 text-success border border-success/30 hover:bg-success/30 transition-colors"
                        >
                          Resume
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="px-2 py-1 text-xs rounded bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
