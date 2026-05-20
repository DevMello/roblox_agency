import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import type { ScheduledJob, Run, Game } from '../types'
import { useGames } from '../hooks/useGames'
import { useRunList } from '../hooks/useRun'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpcomingRun {
  job_id: string
  next_run_time: string
  label?: string
  duration?: string
  forecast?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCRIPT_OPTIONS = [
  'night-cycle',
  'architect',
  'reporter',
  'research',
  'qa-sweep',
  'weekly-research',
]

const TIMEZONE_OPTIONS = [
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
]

const CRON_LABELS = ['min', 'hr', 'day', 'mo', 'dow']

const API = '/api/v1'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function relativeLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatNextRun(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return `${relativeLabel(iso)} ${time}`
  } catch {
    return iso
  }
}

function formatCountdown(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  if (diffMs <= 0) return 'now'
  const h = Math.floor(diffMs / 3_600_000)
  const m = Math.floor((diffMs % 3_600_000) / 60_000)
  return `in ${h}h ${m}m`
}

function formatDayTime(iso: string): { day: string; time: string } {
  try {
    const d = new Date(iso)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const day = d.toDateString() === now.toDateString()
      ? 'Tonight'
      : d.toDateString() === tomorrow.toDateString()
        ? 'Tomorrow'
        : d.toLocaleDateString([], { weekday: 'long' })
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return { day, time }
  } catch {
    return { day: '—', time: '—' }
  }
}

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return '—'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  if (ms >= 3_600_000) return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`
  if (ms >= 60_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
  return `${Math.floor(ms / 1000)}s`
}

function parseCron(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return expr
  const [min, hr, , , dow] = parts
  if (dow !== '*') return `Weekly on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(dow)] ?? dow}`
  if (hr !== '*' && min !== '*') {
    const h = parseInt(hr)
    const m = parseInt(min)
    const h12 = h % 12 || 12
    return `Every day at ${h12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }
  return expr
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'accent' | 'success' }) {
  const color = tone === 'accent' ? 'var(--accent-soft)' : tone === 'success' ? 'var(--success)' : 'var(--ink)'
  return (
    <div className="card card-pad" style={{ flex: 1 }}>
      <div className="text-cap">{label}</div>
      <div className="t-display" style={{ fontSize: 26, marginTop: 6, color }}>{value}</div>
      <div className="t-xs t-muted" style={{ marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function JobRow({
  job,
  onEdit,
  onPause,
  onResume,
  onRunNow,
}: {
  job: ScheduledJob
  onEdit: () => void
  onPause: () => void
  onResume: () => void
  onRunNow: () => void
}) {
  return (
    <div
      className="row gap-16"
      style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', opacity: job.active ? 1 : 0.6 }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: job.active ? 'var(--accent-wash)' : 'var(--surface-2)',
          border: `1px solid ${job.active ? 'var(--accent)' : 'var(--border-2)'}`,
          display: 'grid', placeItems: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={job.active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>

      <div className="col flex-1" style={{ minWidth: 0 }}>
        <div className="row gap-8">
          <span className="t-display" style={{ fontSize: 14 }}>{job.label}</span>
          {job.active ? <span className="chip chip-success">active</span> : <span className="chip">paused</span>}
        </div>
        <div className="row gap-12" style={{ marginTop: 4 }}>
          <span className="t-mono t-xs t-muted">{job.cron_expr}</span>
          <span className="t-mono t-xs t-muted">·</span>
          <span className="t-mono t-xs t-muted">{job.timezone}</span>
          <span className="t-mono t-xs t-muted">·</span>
          <span className="t-mono t-xs t-muted">avg —</span>
        </div>
      </div>

      <div className="col" style={{ alignItems: 'flex-end' }}>
        <div className="text-cap" style={{ marginBottom: 0 }}>Next</div>
        <div className="t-sm t-dim">{formatNextRun(job.next_run ?? null)}</div>
      </div>

      <div className="row gap-4">
        <button className="btn btn-sm" onClick={onEdit}>Edit</button>
        <button className="btn btn-sm btn-ghost" onClick={job.active ? onPause : onResume}>
          {job.active ? 'Pause' : 'Resume'}
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onRunNow}>Run now</button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Schedule() {
  const qc = useQueryClient()

  const jobsQuery = useQuery<ScheduledJob[]>({
    queryKey: ['schedule'],
    queryFn: () => fetchJson<ScheduledJob[]>(`${API}/schedule/`),
    refetchInterval: 30_000,
  })

  const upcomingQuery = useQuery<UpcomingRun[]>({
    queryKey: ['schedule', 'upcoming'],
    queryFn: () => fetchJson<UpcomingRun[]>(`${API}/schedule/upcoming?n=10`),
    refetchInterval: 60_000,
  })

  const runsQuery = useRunList()
  const gamesQuery = useGames()

  const pauseMutation = useMutation({
    mutationFn: (id: string) => fetchJson<void>(`${API}/schedule/${id}/pause`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['schedule'] }),
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => fetchJson<void>(`${API}/schedule/${id}/resume`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['schedule'] }),
  })

  const runNowMutation = useMutation({
    mutationFn: ({ script, game }: { script: string; game: string }) =>
      fetchJson<Run>(`${API}/runs/${script}/${game}`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['runs'] }),
  })

  const addJobMutation = useMutation({
    mutationFn: (body: object) =>
      fetchJson<{ job_id: string }>(`${API}/schedule/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['schedule'] }),
  })

  const [newLabel, setNewLabel] = useState('Night cycle · lava-escape')
  const [newGame, setNewGame] = useState('')
  const [newScript, setNewScript] = useState('night-cycle')
  const [cronParts, setCronParts] = useState(['0', '23', '*', '*', '*'])
  const [newTz, setNewTz] = useState('America/New_York')

  const [editJob, setEditJob] = useState<ScheduledJob | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editGame, setEditGame] = useState('')
  const [editScript, setEditScript] = useState('night-cycle')
  const [editCronParts, setEditCronParts] = useState(['0', '23', '*', '*', '*'])
  const [editTz, setEditTz] = useState('America/New_York')

  const updateJobMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      fetchJson<void>(`${API}/schedule/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['schedule'] })
      setEditJob(null)
    },
  })

  function openEdit(job: ScheduledJob) {
    setEditJob(job)
    setEditLabel(job.label ?? '')
    setEditGame(job.game ?? '')
    setEditScript(job.script ?? 'night-cycle')
    setEditCronParts(job.cron_expr ? job.cron_expr.trim().split(/\s+/) : ['0', '23', '*', '*', '*'])
    setEditTz(job.timezone ?? 'America/New_York')
  }

  function handleEditCronPart(i: number, val: string) {
    setEditCronParts(prev => { const next = [...prev]; next[i] = val; return next })
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editJob) return
    await updateJobMutation.mutateAsync({
      id: editJob.id,
      body: { label: editLabel, game: editGame, script: editScript, cron_expr: editCronParts.join(' '), timezone: editTz },
    })
  }

  const jobs = jobsQuery.data ?? []
  const upcoming = upcomingQuery.data ?? []
  const runs = runsQuery.data ?? []
  const games = gamesQuery.data ?? []

  const activeJobs = jobs.filter(j => j.active).length
  const recentRuns = runs.slice(0, 7)

  const nextRunJob = jobs.reduce<ScheduledJob | undefined>((best, j) => {
    if (!j.active || !j.next_run) return best
    if (!best?.next_run) return j
    return new Date(j.next_run) < new Date(best.next_run) ? j : best
  }, undefined)

  const successCount = recentRuns.filter(r => r.status === 'completed').length
  const successRate = recentRuns.length ? Math.round((successCount / recentRuns.length) * 100) : 0

  function handleCronPart(i: number, val: string) {
    setCronParts(prev => { const next = [...prev]; next[i] = val; return next })
  }

  const cronExpr = cronParts.join(' ')

  async function handleAddJob(e: React.FormEvent) {
    e.preventDefault()
    await addJobMutation.mutateAsync({ label: newLabel, game: newGame, script: newScript, cron_expr: cronExpr, timezone: newTz })
  }

  return (
    <div className="page">
      <div className="page-head fade-up d-0">
        <div>
          <div className="text-cap" style={{ marginBottom: 8, color: 'var(--accent-soft)' }}>Orchestration</div>
          <h1>Schedule</h1>
          <p className="lead">When the agent fleet wakes up, and what it does when it does.</p>
        </div>
        <button className="btn btn-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add schedule
        </button>
      </div>

      <div className="row gap-12 fade-up d-0" style={{ marginBottom: 24 }}>
        <Stat label="Jobs active" value={String(activeJobs)} sub={`of ${jobs.length} · ${jobs.length - activeJobs} paused`} />
        <Stat
          label="Next run"
          value={nextRunJob ? new Date(nextRunJob.next_run).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
          sub={nextRunJob ? formatCountdown(nextRunJob.next_run) : '—'}
          tone="accent"
        />
        <Stat label="Forecast · 7d" value="$4.40" sub="of $5 cap · 88%" />
        <Stat label="Avg success" value={`${successRate}%`} sub="last 30 cycles" tone="success" />
      </div>

      <section className="card fade-up d-1" style={{ marginBottom: 24 }}>
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <h3 style={{ fontSize: 14, marginLeft: 8 }}>Upcoming · next 48 hours</h3>
          <div className="spacer" />
          <span className="t-mono t-xs t-muted">timezone · America/New_York · GMT-4</span>
        </div>

        {upcoming.length === 0 ? (
          <div style={{ padding: '20px 22px' }} className="t-sm t-muted">
            {upcomingQuery.isLoading ? 'Loading…' : 'No upcoming runs scheduled.'}
          </div>
        ) : (
          upcoming.slice(0, 8).map((u, i) => {
            const { day, time } = formatDayTime(u.next_run_time)
            const isAccent = i < 3
            return (
              <div
                key={u.job_id + i}
                className="row gap-16"
                style={{
                  padding: '14px 22px',
                  borderTop: i ? '1px solid var(--border)' : 'none',
                  background: isAccent ? 'rgba(124,111,255,0.04)' : 'transparent',
                }}
              >
                <span className={clsx('dot', isAccent ? 'dot-accent' : 'dot-muted')} style={{ marginTop: 6 }} />
                <div className="col" style={{ width: 110 }}>
                  <span className="t-display" style={{ fontSize: 13 }}>{day}</span>
                  <span className="t-mono t-xs t-muted">{time}</span>
                </div>
                <div className="col flex-1">
                  <span className="t-sm" style={{ fontWeight: 500 }}>{u.label ?? u.job_id}</span>
                  <span className="t-xs t-muted">{u.duration ?? 'est —'} · forecast {u.forecast ?? '—'}</span>
                </div>
                <button className="btn btn-sm btn-ghost">Edit</button>
                <button className="btn btn-sm btn-ghost">Skip</button>
              </div>
            )
          })
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 24 }}>
        <section className="card fade-up d-2">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Configured jobs · {jobs.length}</h3>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost">Sort: next ▾</button>
          </div>

          {jobsQuery.isLoading ? (
            <div style={{ padding: '20px 22px' }} className="t-sm t-muted">Loading…</div>
          ) : jobs.length === 0 ? (
            <div style={{ padding: '20px 22px' }} className="t-sm t-muted">No jobs configured yet.</div>
          ) : (
            jobs.map(job => (
              <JobRow
                key={job.id}
                job={job}
                onEdit={() => openEdit(job)}
                onPause={() => pauseMutation.mutate(job.id)}
                onResume={() => resumeMutation.mutate(job.id)}
                onRunNow={() => runNowMutation.mutate({ script: job.script, game: job.game })}
              />
            ))
          )}
        </section>

        <section className="card fade-up d-3" style={{ alignSelf: 'flex-start' }}>
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <h3 style={{ fontSize: 14, marginLeft: 8 }}>New job</h3>
          </div>

          <form className="col gap-12" style={{ padding: '16px 20px' }} onSubmit={e => void handleAddJob(e)}>
            <div>
              <label className="label-cap">Label</label>
              <input className="field" value={newLabel} onChange={e => setNewLabel(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="label-cap">Game</label>
                <select className="field" value={newGame} onChange={e => setNewGame(e.target.value)}>
                  <option value="">— all games —</option>
                  {games.map((g: Game) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-cap">Script</label>
                <select className="field" value={newScript} onChange={e => setNewScript(e.target.value)}>
                  {SCRIPT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label-cap">Cron</label>
              <div className="row gap-6">
                {cronParts.map((v, i) => (
                  <input key={i} className="field field-mono" value={v} onChange={e => handleCronPart(i, e.target.value)} style={{ width: 56, textAlign: 'center' }} />
                ))}
              </div>
              <div className="row gap-6" style={{ marginTop: 6 }}>
                {CRON_LABELS.map(l => (
                  <span key={l} className="t-mono t-xs t-muted" style={{ width: 56, textAlign: 'center' }}>{l}</span>
                ))}
              </div>
            </div>

            <div style={{ padding: 10, background: 'var(--bg)', border: '1px dashed var(--border-2)', borderRadius: 6 }}>
              <div className="t-mono t-xs t-muted">Translated</div>
              <div className="t-sm t-accent" style={{ marginTop: 2 }}>"{parseCron(cronExpr)}"</div>
            </div>

            <div>
              <label className="label-cap">Timezone</label>
              <select className="field" value={newTz} onChange={e => setNewTz(e.target.value)}>
                {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 4 }} disabled={addJobMutation.isPending}>
              {addJobMutation.isPending ? 'Saving…' : 'Save schedule'}
            </button>
            <div className="t-xs t-muted" style={{ textAlign: 'center' }}>
              Cron more frequent than 1 / hour rejected (cost guard)
            </div>
          </form>
        </section>
      </div>

      <section className="card fade-up d-4">
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14 }}>Run history · last 7 days</h3>
          <div className="spacer" />
          <span className="t-mono t-xs t-muted">{recentRuns.length} cycles · {successRate}% success</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Date', 'Job', 'Duration', 'Spend', 'Tasks', 'Status'].map((h, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '10px 20px', fontFamily: 'var(--f-mono)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runsQuery.isLoading ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }} className="t-sm t-muted">Loading…</td></tr>
            ) : recentRuns.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }} className="t-sm t-muted">No runs recorded yet.</td></tr>
            ) : (
              recentRuns.map(r => {
                const isSuccess = r.status === 'completed'
                const isFailed = r.status === 'failed'
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 20px' }}>
                      <span className="t-mono t-xs t-muted">
                        {r.started_at ? new Date(r.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 20px' }}>
                      <span className="t-sm">{r.script}{r.game ? ` · ${r.game}` : ''}</span>
                    </td>
                    <td style={{ padding: '10px 20px' }}>
                      <span className="t-mono t-xs t-dim">{formatDuration(r.started_at, r.ended_at)}</span>
                    </td>
                    <td style={{ padding: '10px 20px' }}><span className="t-mono t-xs t-dim">—</span></td>
                    <td style={{ padding: '10px 20px' }}><span className="t-mono t-xs t-dim">—</span></td>
                    <td style={{ padding: '10px 20px' }}>
                      {isSuccess && <span className="chip chip-success">✓ clean</span>}
                      {isFailed && <span className="chip chip-danger">✗ failed</span>}
                      {!isSuccess && !isFailed && (
                        <span className={clsx('chip', r.status === 'running' && 'chip-accent')}>{r.status}</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>

      {editJob && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'grid', placeItems: 'center', zIndex: 1000,
          }}
          onClick={e => { if (e.target === e.currentTarget) setEditJob(null) }}
        >
          <div className="card" style={{ width: 440, padding: 0 }}>
            <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14 }}>Edit job</h3>
              <div className="spacer" />
              <button className="btn btn-sm btn-ghost" onClick={() => setEditJob(null)}>✕</button>
            </div>
            <form className="col gap-12" style={{ padding: '16px 20px' }} onSubmit={e => void handleSaveEdit(e)}>
              <div>
                <label className="label-cap">Label</label>
                <input className="field" value={editLabel} onChange={e => setEditLabel(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label-cap">Game</label>
                  <select className="field" value={editGame} onChange={e => setEditGame(e.target.value)}>
                    <option value="">— all games —</option>
                    {games.map((g: Game) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-cap">Script</label>
                  <select className="field" value={editScript} onChange={e => setEditScript(e.target.value)}>
                    {SCRIPT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-cap">Cron</label>
                <div className="row gap-6">
                  {editCronParts.map((v, i) => (
                    <input key={i} className="field field-mono" value={v} onChange={e => handleEditCronPart(i, e.target.value)} style={{ width: 56, textAlign: 'center' }} />
                  ))}
                </div>
                <div className="row gap-6" style={{ marginTop: 6 }}>
                  {CRON_LABELS.map(l => (
                    <span key={l} className="t-mono t-xs t-muted" style={{ width: 56, textAlign: 'center' }}>{l}</span>
                  ))}
                </div>
              </div>
              <div style={{ padding: 10, background: 'var(--bg)', border: '1px dashed var(--border-2)', borderRadius: 6 }}>
                <div className="t-mono t-xs t-muted">Translated</div>
                <div className="t-sm t-accent" style={{ marginTop: 2 }}>"{parseCron(editCronParts.join(' '))}"</div>
              </div>
              <div>
                <label className="label-cap">Timezone</label>
                <select className="field" value={editTz} onChange={e => setEditTz(e.target.value)}>
                  {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div className="row gap-8" style={{ marginTop: 4 }}>
                <button type="button" className="btn btn-ghost flex-1" style={{ justifyContent: 'center' }} onClick={() => setEditJob(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1" style={{ justifyContent: 'center' }} disabled={updateJobMutation.isPending}>
                  {updateJobMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
