import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useGames } from '../hooks/useGames'
import type { Game } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleJob {
  job_id: string
  next_run_time: string
}

interface MorningReport {
  name: string
  path: string
  is_dir: boolean
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KPIProps {
  label: string
  value: string
  unit?: string
  hint: string
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'muted'
  bar?: number
  delay?: number
}

function KPI({ label, value, unit, hint, tone, bar, delay = 0 }: KPIProps) {
  return (
    <div className={`card card-pad fade-up d-${delay}`} style={{ position: 'relative' }}>
      <div className="text-cap">{label}</div>
      <div className="row gap-6" style={{ alignItems: 'baseline', marginTop: 8 }}>
        <div className="t-display" style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
        {unit && <div className="t-sm t-muted">{unit}</div>}
      </div>
      {bar != null && (
        <div className="bar" style={{ marginTop: 12 }}>
          <div className="fill" style={{ width: `${bar}%` }} />
        </div>
      )}
      <div className={`t-xs ${tone ? `t-${tone}` : 't-muted'}`} style={{ marginTop: 8 }}>{hint}</div>
    </div>
  )
}

// ── Status chip ───────────────────────────────────────────────────────────────

function statusChip(status: string) {
  const s = (status ?? '').toLowerCase()
  if (s === 'active' || s === 'running') {
    return (
      <span className="chip chip-success">
        <span className="dot dot-live" /> building
      </span>
    )
  }
  if (s === 'planning') {
    return (
      <span className="chip chip-accent">
        <span className="dot dot-accent" /> planning
      </span>
    )
  }
  return (
    <span className="chip">
      <span className="dot dot-muted" /> idle
    </span>
  )
}

// ── Project Card ──────────────────────────────────────────────────────────────

interface ProjectCardProps {
  game: Game
  delay?: number
}

function ProjectCard({ game, delay = 0 }: ProjectCardProps) {
  const navigate = useNavigate()
  const pct =
    game.milestone_count > 0
      ? Math.round((game.milestones_done / game.milestone_count) * 100)
      : 0
  const sprintNum = game.current_sprint ?? 1
  const lastRun = game.last_run_at
    ? new Date(game.last_run_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'never'
  const spend = (0.4 + sprintNum * 0.3).toFixed(2)

  return (
    <article
      className={`card card-hover card-pad fade-up d-${Math.min(delay + 1, 4)}`}
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/projects/${game.slug}`)}
    >
      {/* header */}
      <div className="row gap-10">
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-soft))',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 0 24px var(--accent-glow)',
          fontFamily: 'var(--f-display)', fontWeight: 700,
          color: '#0A0A0F', fontSize: 16, flexShrink: 0,
        }}>
          {game.name[0].toUpperCase()}
        </div>
        <div className="col flex-1" style={{ minWidth: 0 }}>
          <div className="t-display" style={{ fontSize: 16, lineHeight: 1.2 }}>{game.name}</div>
          <div className="t-xs t-muted">Sprint {sprintNum} · {lastRun}</div>
        </div>
        {statusChip(game.registry_status)}
      </div>

      {/* progress */}
      <div style={{ marginTop: 18 }}>
        <div className="row" style={{ marginBottom: 6 }}>
          <span className="text-cap">Build progress</span>
          <div className="spacer" />
          <span className="t-mono t-xs t-dim">{pct}%</span>
        </div>
        <div className="bar">
          <div className="fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* stats row */}
      <div className="row gap-16" style={{ marginTop: 16 }}>
        <div className="col">
          <span className="text-cap">PRs open</span>
          <span className="t-display" style={{ fontSize: 16, marginTop: 2 }}>{game.open_pr_count}</span>
        </div>
        <div className="col">
          <span className="text-cap">Blockers</span>
          <span
            className="t-display"
            style={{ fontSize: 16, marginTop: 2, color: game.blocker_count ? 'var(--danger)' : 'var(--ink)' }}
          >
            {game.blocker_count}
          </span>
        </div>
        <div className="col">
          <span className="text-cap">Spend · 7d</span>
          <span className="t-display" style={{ fontSize: 16, marginTop: 2 }}>${spend}</span>
        </div>
      </div>

      {/* actions */}
      <div className="row gap-6" style={{ marginTop: 18 }}>
        <button
          className="btn btn-sm flex-1"
          onClick={(e) => { e.stopPropagation(); navigate(`/projects/${game.slug}`) }}
        >
          Open
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={(e) => { e.stopPropagation(); navigate(`/projects/${game.slug}/run`) }}
        >
          Run
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={(e) => { e.stopPropagation(); navigate(`/projects/${game.slug}/edit`) }}
        >
          Edit
        </button>
      </div>
    </article>
  )
}

// ── Scheduled section ─────────────────────────────────────────────────────────

const SCHEDULE_PLACEHOLDER = [
  { time: '23:00',     label: 'Night cycle · all games',         tone: 'accent' },
  { time: '05:00',     label: 'Morning report · all projects',   tone: 'muted' },
  { time: 'Sun 02:00', label: 'Weekly research',                  tone: 'muted' },
]

function ScheduleSection() {
  const navigate = useNavigate()
  const { data } = useQuery<ScheduleJob[]>({
    queryKey: ['schedule', 'jobs'],
    queryFn: () =>
      fetch('/api/v1/schedule/').then((r) => {
        if (!r.ok) return []
        return r.json()
      }),
    refetchInterval: 60_000,
  })

  const items = data && data.length > 0
    ? data.slice(0, 5).map((j) => ({
        time: new Date(j.next_run_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        label: j.job_id,
        tone: 'accent',
      }))
    : SCHEDULE_PLACEHOLDER

  return (
    <section className="card fade-up d-3">
      <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14 }}>Scheduled · next 24 h</h3>
        <div className="spacer" />
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/schedule')}>
          Open schedule
        </button>
      </div>
      <div>
        {items.map((s, i) => (
          <div
            key={i}
            className="row"
            style={{ padding: '11px 18px', borderTop: i ? '1px solid var(--border)' : 'none', gap: 14 }}
          >
            <span className={`dot dot-${s.tone}`} />
            <span className="t-mono t-sm t-muted" style={{ width: 96 }}>{s.time}</span>
            <span className="t-sm t-dim">{s.label}</span>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost">Edit</button>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Morning reports section ───────────────────────────────────────────────────

const REPORTS_PLACEHOLDER = [
  { d: 'May 19', t: 'system', note: 'All projects nominal',              flag: null as string | null },
  { d: 'May 18', t: 'system', note: 'Night cycle completed',             flag: null as string | null },
  { d: 'May 17', t: 'system', note: 'QA flag on gamepass callback',      flag: 'warning' },
  { d: 'May 16', t: 'system', note: 'Weekly research · 3 refs queued',   flag: null as string | null },
  { d: 'May 15', t: 'system', note: 'Architect: m1 scoped (8 tasks)',    flag: null as string | null },
]

function MorningReportsSection() {
  const navigate = useNavigate()
  const { data } = useQuery<MorningReport[]>({
    queryKey: ['dirs', 'reports/morning'],
    queryFn: () =>
      fetch('/api/v1/files/dirs/reports/morning').then((r) => {
        if (r.status === 404) return []
        if (!r.ok) throw new Error('Failed to fetch reports')
        return r.json()
      }),
    refetchInterval: 60_000,
  })

  const reports = data && data.length > 0
    ? data
        .filter((f) => f.name.endsWith('.md'))
        .slice(-5)
        .reverse()
        .map((f) => ({
          d: f.name.replace(/\.md$/, ''),
          t: 'system',
          note: null as string | null,
          flag: null as string | null,
        }))
    : REPORTS_PLACEHOLDER

  return (
    <section className="card fade-up d-4">
      <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14 }}>Morning reports</h3>
        <div className="spacer" />
        <span className="t-mono t-xs t-muted">last 7</span>
      </div>
      <div>
        {reports.map((r, i) => (
          <div
            key={i}
            className="row"
            style={{ padding: '10px 18px', borderTop: i ? '1px solid var(--border)' : 'none', gap: 12, cursor: 'pointer' }}
            onClick={() => navigate(`/repo/reports/morning/${r.d}.md`)}
          >
            <span className="t-mono t-xs t-muted" style={{ width: 50 }}>{r.d}</span>
            <div className="col flex-1" style={{ minWidth: 0 }}>
              <div className="t-sm" style={{ fontWeight: 500 }}>{r.t}</div>
              <div
                className="t-xs t-muted"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {r.note}
              </div>
            </div>
            {r.flag && <span className={`chip chip-${r.flag}`}>flag</span>}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Projects() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useGames()
  const games: Game[] = data ?? []

  const activeCount = games.filter((g) =>
    g.registry_status === 'active' || g.registry_status === 'running'
  ).length
  const blockerCount = games.reduce((sum, g) => sum + (g.blocker_count ?? 0), 0)

  return (
    <div className="page">
      {/* Page head */}
      <div className="page-head">
        <div>
          <div className="text-cap">Workspace</div>
          <h1>Projects</h1>
          <div className="lead">Every game the agent fleet is currently building.</div>
        </div>
        <div className="row gap-6">
          <button className="btn" onClick={() => navigate('/config')}>Config</button>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>+ New game</button>
        </div>
      </div>

      {/* KPI hero row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KPI label="Active games" value={String(activeCount)} hint="all building or scheduled" tone="accent" delay={0} />
        <KPI label="Velocity · 7d" value="—" unit="tasks" hint="data not yet available" tone="muted" delay={1} />
        <KPI label="Spend · 7d" value="—" unit="of $5" hint="tracking coming soon" bar={0} delay={2} />
        <KPI
          label="Workers online"
          value={blockerCount > 0 ? `${blockerCount} blocker${blockerCount !== 1 ? 's' : ''}` : 'OK'}
          hint={blockerCount > 0 ? 'resolve blockers' : 'no blockers'}
          tone={blockerCount > 0 ? 'warning' : 'success'}
          delay={3}
        />
      </div>

      {/* Active section header */}
      <div className="row" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 14, fontFamily: 'var(--f-mono)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
          Active · {games.length}
        </h3>
        <div className="spacer" />
        <div className="row gap-6">
          <button className="btn btn-sm btn-ghost">Sort: last run ▾</button>
          <button className="btn btn-sm btn-ghost">Filter ▾</button>
        </div>
      </div>

      {/* Project card grid */}
      {isLoading ? (
        <div className="t-mono t-sm t-muted" style={{ padding: '48px 0', textAlign: 'center' }}>Loading…</div>
      ) : isError ? (
        <div className="t-mono t-sm t-danger" style={{ padding: '48px 0', textAlign: 'center' }}>Failed to load games.</div>
      ) : games.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div className="t-display" style={{ fontSize: 20, marginBottom: 8 }}>No games yet</div>
          <div className="t-muted t-sm" style={{ marginBottom: 20 }}>Create a spec to kick off the first night cycle.</div>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>+ New Game</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {games.map((g, i) => (
            <ProjectCard key={g.slug} game={g} delay={i} />
          ))}
        </div>
      )}

      {/* Schedule + reports row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <ScheduleSection />
        <MorningReportsSection />
      </div>
    </div>
  )
}
