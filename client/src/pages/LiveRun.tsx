import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRunStore } from '../store/runStore'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LogEntry {
  t: string
  a: string
  m: string
  lvl: string
}

interface TaskEntry {
  id: string
  title: string
  status: 'done' | 'running' | 'blocked' | 'pending'
  pct?: number
  blocker?: string
}

interface AgentEntry {
  name: string
  state: 'done' | 'running' | 'waiting'
  desc: string
  dot: 'success' | 'live' | 'muted'
  pct?: number
}

// ── Module-level color maps (not recreated on every render) ───────────────────

const AGENT_COLOR: Record<string, string> = {
  planner:  '#A89CFF',
  builder:  '#7C6FFF',
  QA:       '#FFB547',
  reporter: '#00E5A0',
}

const LVL_COLOR: Record<string, string> = {
  i: 'var(--ink-dim)',
  s: 'var(--success)',
  w: 'var(--warning)',
  e: 'var(--danger)',
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MetricProps {
  label: string
  value: string
  sub: string
  tone?: 'accent' | 'danger'
  bar?: number
}

function Metric({ label, value, sub, tone, bar }: MetricProps) {
  const valueColor =
    tone === 'danger'
      ? 'var(--danger)'
      : tone === 'accent'
      ? 'var(--accent-soft)'
      : 'var(--ink)'
  return (
    <div className="card" style={{ padding: '10px 14px', flex: 1, minWidth: 150 }}>
      <div className="text-cap">{label}</div>
      <div className="row gap-6" style={{ alignItems: 'baseline', marginTop: 2 }}>
        <span className="t-display" style={{ fontSize: 18, color: valueColor }}>{value}</span>
      </div>
      {bar != null && (
        <div className="bar" style={{ marginTop: 6, height: 4 }}>
          <div className="fill" style={{ width: `${bar}%` }} />
        </div>
      )}
      <div className="t-xs t-muted" style={{ marginTop: 4 }}>{sub}</div>
    </div>
  )
}

interface LogLineProps {
  t: string
  a: string
  m: string
  lvl: string
}

function LogLine({ t, a, m, lvl }: LogLineProps) {
  return (
    <div
      className="row gap-10"
      style={{ padding: '3px 16px', cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ color: 'var(--muted-2)', width: 64, flexShrink: 0 }}>[{t}]</span>
      <span style={{ color: AGENT_COLOR[a] ?? 'var(--muted)', width: 64, flexShrink: 0, fontWeight: 500 }}>{a}</span>
      <span style={{ color: LVL_COLOR[lvl] ?? 'var(--ink-dim)', flex: 1 }}>{m}</span>
    </div>
  )
}

interface TaskGroupProps {
  title: string
  count: number
  tone?: 'success' | 'accent' | 'danger'
  children: React.ReactNode
}

function TaskGroup({ title, count, tone, children }: TaskGroupProps) {
  const titleColor =
    tone === 'accent'
      ? 'var(--accent-soft)'
      : tone === 'success'
      ? 'var(--success)'
      : tone === 'danger'
      ? 'var(--danger)'
      : 'var(--muted)'
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="row gap-6" style={{ marginBottom: 6, padding: '0 4px' }}>
        <span className={`dot dot-${tone ?? 'muted'}`} />
        <span className="text-cap" style={{ color: titleColor }}>{title}</span>
        <div className="spacer" />
        <span className="t-mono t-xs t-muted">{count}</span>
      </div>
      <div className="col gap-4">{children}</div>
    </div>
  )
}

interface TaskCardProps {
  label: string
  done?: boolean
  pct?: number
  live?: boolean
  blocker?: string
  note?: string
}

function TaskCard({ label, done, pct, live, blocker, note }: TaskCardProps) {
  return (
    <div
      style={{
        padding: '8px 10px',
        borderRadius: 6,
        border: '1px solid ' + (live ? 'var(--accent)' : blocker ? 'rgba(255,74,110,0.3)' : 'var(--border)'),
        background: live ? 'var(--accent-wash)' : blocker ? 'var(--danger-soft)' : 'var(--surface-2)',
      }}
    >
      <div
        className="t-sm"
        style={{
          color: done ? 'var(--muted)' : 'var(--ink-dim)',
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {label}
      </div>
      {pct != null && (
        <div style={{ marginTop: 6 }}>
          <div className="bar" style={{ height: 4 }}>
            <div className="fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {note && <div className="t-xs t-muted" style={{ marginTop: 4 }}>{note}</div>}
      {blocker && <div className="t-xs t-danger" style={{ marginTop: 4 }}>↳ {blocker}</div>}
    </div>
  )
}

// ── Elapsed timer ─────────────────────────────────────────────────────────────

function useElapsed(startMs: number) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startMs), 1000)
    return () => clearInterval(id)
  }, [startMs])
  const s = Math.floor(elapsed / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── Static fallbacks (used when store is empty) ───────────────────────────────

const FALLBACK_AGENTS: AgentEntry[] = [
  { name: 'planner',  state: 'done',    desc: 'sprint plan written',   dot: 'success', pct: 100 },
  { name: 'builder',  state: 'running', desc: 'waiting for tasks',     dot: 'live',    pct: 0 },
  { name: 'QA',       state: 'waiting', desc: 'queue · 0 PRs pending', dot: 'muted' },
  { name: 'reporter', state: 'waiting', desc: 'fires at 05:00',        dot: 'muted' },
]

// ── Helpers to map store data ─────────────────────────────────────────────────

function mapStoreLogs(rawLogs: string[]): LogEntry[] {
  return rawLogs.map((line) => {
    // Attempt to parse "[HH:MM:SS] agentName message" format
    const m = /^\[(\d{2}:\d{2}:\d{2})\]\s+(\S+)\s+(.+)$/.exec(line)
    if (m) {
      const [, t, a, msg] = m
      const lvl = msg.startsWith('✓') || msg.startsWith('→ committed') ? 's'
        : msg.includes('error') || msg.includes('502') || msg.includes('giving up') ? 'e'
        : msg.includes('retry') || msg.includes('warn') ? 'w'
        : 'i'
      return { t, a, m: msg, lvl }
    }
    return { t: '--:--:--', a: 'system', m: line, lvl: 'i' }
  })
}

function mapStoreTasks(storeTasks: Array<{ id: string; title: string; status: string; blocker_ref?: string | null; estimated_minutes?: number }>): TaskEntry[] {
  return storeTasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: (t.status === 'done' || t.status === 'running' || t.status === 'blocked' || t.status === 'pending')
      ? (t.status as TaskEntry['status'])
      : 'pending',
    blocker: t.blocker_ref ?? undefined,
  }))
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LiveRun() {
  const { game } = useParams<{ game: string }>()
  const navigate = useNavigate()
  const startMs = useRef(Date.now())
  const elapsed = useElapsed(startMs.current)

  const storeLogs = useRunStore((s) => s.logs)
  const storeTasks = useRunStore((s) => s.tasks)
  const storeAgents = useRunStore((s) => s.agentActivity)
  const activeRun = useRunStore((s) => s.activeRun)

  const [filter, setFilter] = useState<string>('all')
  const [paused, setPaused] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const parsedLogs = useMemo(() => mapStoreLogs(storeLogs), [storeLogs])
  const taskEntries = useMemo(() => mapStoreTasks(storeTasks), [storeTasks])

  const agentEntries = useMemo<AgentEntry[]>(() => {
    if (Object.keys(storeAgents).length === 0) return FALLBACK_AGENTS
    return Object.entries(storeAgents).map(([name, desc]) => ({
      name,
      state: desc.includes('done') || desc.includes('complete') ? 'done'
        : desc.includes('running') || desc.includes('working') ? 'running'
        : 'waiting',
      desc,
      dot: desc.includes('done') || desc.includes('complete') ? 'success'
        : desc.includes('running') || desc.includes('working') ? 'live'
        : 'muted',
    } satisfies AgentEntry))
  }, [storeAgents])

  const doneTasks    = useMemo(() => taskEntries.filter((t) => t.status === 'done'),    [taskEntries])
  const runningTasks = useMemo(() => taskEntries.filter((t) => t.status === 'running'), [taskEntries])
  const blockedTasks = useMemo(() => taskEntries.filter((t) => t.status === 'blocked'), [taskEntries])
  const queueTasks   = useMemo(() => taskEntries.filter((t) => t.status === 'pending'), [taskEntries])

  const filtered = useMemo(
    () => filter === 'all' ? parsedLogs : parsedLogs.filter((l) => l.a === filter),
    [parsedLogs, filter],
  )

  const totalTasks = taskEntries.length || 12
  const doneCnt    = doneTasks.length
  const blockerCnt = blockedTasks.length

  useEffect(() => {
    if (!paused && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [parsedLogs, paused])

  const handleStop = useCallback(async () => {
    if (!activeRun?.id) {
      navigate(`/projects/${game ?? ''}`)
      return
    }
    try {
      await fetch(`/api/v1/runs/${activeRun.id}`, { method: 'DELETE' })
    } catch {
      // ignore
    }
    navigate(`/projects/${game ?? ''}`)
  }, [activeRun, game, navigate])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="crumbs">
          <Link to="/projects" className="crumb" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 13 }}>Projects</Link>
          <span className="sep">/</span>
          <Link to={`/projects/${game ?? ''}`} className="crumb" style={{ color: 'var(--ink-dim)', textDecoration: 'none', fontSize: 13 }}>{game}</Link>
          <span className="sep">/</span>
          <span className="crumb last">Live run</span>
        </div>
        <div className="spacer" />
        <span className="t-mono t-xs t-muted" style={{ whiteSpace: 'nowrap' }}>{elapsed}</span>
        <button className="btn btn-sm" onClick={() => setPaused((p) => !p)}>
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button className="btn btn-sm btn-danger" onClick={() => void handleStop()}>
          ■ Stop
        </button>
      </div>

      {/* ── Page content ── */}
      <div className="page" style={{ overflow: 'auto' }}>
        {/* Page head */}
        <div style={{ marginBottom: 20 }}>
          <div className="t-mono t-xs t-muted" style={{ marginBottom: 6, letterSpacing: '0.08em' }}>
            ● Live · night cycle
          </div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', margin: 0 }}>
            Running · <span style={{ color: 'var(--accent-soft)' }}>{game}</span>
          </h1>
          <div className="t-muted" style={{ fontSize: 13.5, marginTop: 4 }}>
            Streaming logs from the build process. Filter by agent. Click any line to anchor it.
          </div>
        </div>

        {/* Metrics ribbon */}
        <div className="row gap-10" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
          <Metric label="Tasks"    value={`${doneCnt} / ${totalTasks}`} sub={`${Math.round((doneCnt / totalTasks) * 100)}% complete`} tone="accent" />
          <Metric label="Tokens"   value="—"                             sub="of 200 k cap"       bar={0} />
          <Metric label="Spend"    value="—"                             sub="of $5.00 budget"    bar={0} />
          <Metric label="MCP ops"  value="—"                             sub="roblox-studio"      />
          <Metric label="Blockers" value={String(blockerCnt)}            sub={blockerCnt > 0 ? 'see task board' : 'none'} tone={blockerCnt > 0 ? 'danger' : undefined} />
          <div className="spacer" />
          <button className="btn btn-sm btn-ghost">Workers · 1</button>
        </div>

        {/* 3-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr 280px',
            gap: 16,
            height: 'calc(100vh - 320px)',
            minHeight: 460,
          }}
        >
          {/* ── Agents panel ── */}
          <section className="card fade-up d-1" style={{ overflow: 'hidden' }}>
            <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 13 }}>Agents</h3>
              <div className="spacer" />
              <span className="t-mono t-xs t-muted">{agentEntries.length}</span>
            </div>
            <div className="col gap-2" style={{ padding: 8, overflowY: 'auto', height: 'calc(100% - 45px)' }}>
              {agentEntries.map((a) => (
                <div
                  key={a.name}
                  style={{
                    padding: 11,
                    borderRadius: 8,
                    border: '1px solid ' + (a.state === 'running' ? 'var(--accent)' : 'var(--border)'),
                    background: a.state === 'running' ? 'var(--accent-wash)' : 'transparent',
                  }}
                >
                  <div className="row gap-8">
                    <span className={`dot dot-${a.dot}`} />
                    <span className="t-display" style={{ fontSize: 14 }}>{a.name}</span>
                    <div className="spacer" />
                    <span className="t-mono t-xs t-muted">{a.state}</span>
                  </div>
                  <div className="t-xs t-dim" style={{ marginTop: 6 }}>{a.desc}</div>
                  {a.pct != null && (
                    <div className="bar" style={{ marginTop: 8 }}>
                      <div
                        className="fill"
                        style={{
                          width: `${a.pct}%`,
                          background: a.state === 'done' ? 'var(--success)' : undefined,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Log stream ── */}
          <section className="card fade-up d-2" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="row gap-10" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontSize: 13 }}>Log stream</h3>
              <div className="spacer" />
              <div className="row gap-4">
                {(['all', 'planner', 'builder', 'QA'] as const).map((f) => (
                  <button
                    key={f}
                    className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="divider-v" style={{ margin: '0 4px' }} />
              <span className="row gap-4 t-xs t-muted">
                <span className="dot dot-live" /> auto-scroll
              </span>
            </div>

            <div
              ref={logRef}
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '8px 0',
                background: 'var(--bg)',
                fontFamily: 'var(--f-mono)',
                fontSize: 12,
              }}
            >
              {filtered.length === 0 ? (
                <div style={{ padding: '4px 16px', color: 'var(--muted)' }}>Waiting for output…</div>
              ) : (
                filtered.map((l, i) => <LogLine key={i} {...l} />)
              )}
              {!paused && (
                <div style={{ padding: '4px 16px' }}>
                  <span className="t-mono t-xs t-muted">[{new Date().toTimeString().slice(0, 8)}]</span>
                  <span style={{ marginLeft: 10 }} className="t-mono t-xs t-accent">builder</span>
                  <span className="caret" />
                </div>
              )}
            </div>

            <div className="row gap-10" style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <span className="t-mono t-xs t-muted">{parsedLogs.length} lines · ring buffer 2000</span>
              <div className="spacer" />
              <span className="t-mono t-xs t-muted">streaming…</span>
            </div>
          </section>

          {/* ── Task board ── */}
          <section className="card fade-up d-3" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontSize: 13 }}>Task board</h3>
              <div className="spacer" />
              <span className="t-mono t-xs t-muted">
                {activeRun ? `run ${activeRun.script}` : 'live'}
              </span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
              {taskEntries.length === 0 ? (
                <div className="t-xs t-muted" style={{ padding: '8px 4px' }}>No task data yet…</div>
              ) : (
                <>
                  {doneTasks.length > 0 && (
                    <TaskGroup tone="success" title="Done" count={doneTasks.length}>
                      {doneTasks.map((t) => <TaskCard key={t.id} label={`${t.id} · ${t.title}`} done />)}
                    </TaskGroup>
                  )}
                  {runningTasks.length > 0 && (
                    <TaskGroup tone="accent" title="In progress" count={runningTasks.length}>
                      {runningTasks.map((t) => (
                        <TaskCard key={t.id} label={`${t.id} · ${t.title}`} pct={t.pct} live />
                      ))}
                    </TaskGroup>
                  )}
                  {blockedTasks.length > 0 && (
                    <TaskGroup tone="danger" title="Blocked" count={blockedTasks.length}>
                      {blockedTasks.map((t) => (
                        <TaskCard key={t.id} label={`${t.id} · ${t.title}`} blocker={t.blocker} />
                      ))}
                    </TaskGroup>
                  )}
                  {queueTasks.length > 0 && (
                    <TaskGroup title="Queue" count={queueTasks.length}>
                      {queueTasks.map((t) => <TaskCard key={t.id} label={`${t.id} · ${t.title}`} />)}
                    </TaskGroup>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
