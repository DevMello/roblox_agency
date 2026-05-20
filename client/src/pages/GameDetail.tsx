import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useGame } from '../hooks/useGames'
import { ROUTES } from '../router'
import type { Game } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'plan' | 'sprint' | 'progress' | 'prs' | 'reports' | 'overrides'

interface Blocker {
  id: string
  title: string
  status: string
  game: string
  description: string
  opened_by?: string
  sprint?: string
  age?: string
}

interface MilestoneItem {
  label: string
  pct: number
  done?: boolean
  active?: boolean
  notes: string
}

interface CommitItem {
  t: string
  sha: string
  msg: string
  branch: string
}

interface PRItem {
  number: number
  title: string
  state: 'QA' | 'approved' | 'open'
  detail: string
}

// ── Shared icons ──────────────────────────────────────────────────────────────

function FileIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

// ── Donut SVG ─────────────────────────────────────────────────────────────────

function Donut({ pct }: { pct: number }) {
  const r = 32
  const c = 2 * Math.PI * r
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border-2)" strokeWidth="6" />
      <circle
        cx="40" cy="40" r={r} fill="none" stroke="var(--accent)" strokeWidth="6"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        strokeLinecap="round" transform="rotate(-90 40 40)"
        style={{ filter: 'drop-shadow(0 0 8px var(--accent-glow))' }}
      />
      <text
        x="40" y="46" textAnchor="middle"
        fontFamily="var(--f-display)" fontSize="18" fill="var(--ink)" fontWeight="600"
      >
        {pct}%
      </text>
    </svg>
  )
}

// ── Placeholder Tab ───────────────────────────────────────────────────────────

function PlaceholderTab({ title, file, tail }: { title: string; file: string; tail?: boolean }) {
  return (
    <div className="card card-pad fade-up" style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ opacity: 0.6, color: 'var(--accent-soft)' }}>
        <FileIcon size={28} />
      </div>
      <h3 style={{ fontSize: 18, marginTop: 14 }}>{title}</h3>
      <div className="t-sm t-muted" style={{ marginTop: 6 }}>
        Renders the underlying markdown live{tail ? ', with tail mode for append-only streams' : ''}.
      </div>
      <div className="t-mono t-xs t-muted" style={{ marginTop: 14 }}>{file}</div>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ game, gameSlug }: { game: Game; gameSlug: string }) {
  const navigate = useNavigate()

  const { data: blockersRaw } = useQuery<Blocker[]>({
    queryKey: ['blockers', gameSlug],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/blockers`).then(r => r.json()),
  })

  const blockers: Blocker[] = blockersRaw ?? []

  const milestones: MilestoneItem[] = useMemo(
    () => (game as any).plan_milestones?.map((ms: any) => ({
      label: ms.title ?? ms.short_title ?? ms.id,
      pct: ms.status === 'complete' ? 100 : ms.status === 'in-progress' || ms.status === 'active' ? 50 : 0,
      done: ms.status === 'complete',
      active: ms.status === 'in-progress' || ms.status === 'active',
      notes: ms.goal ?? '',
    })) ?? [],
    [game],
  )

  const tasksDone: number = game.tasks_done ?? 0
  const taskCount: number = game.task_count ?? 0
  const sprintPct: number = taskCount > 0 ? Math.round((tasksDone / taskCount) * 100) : 0

  const recentCommits: CommitItem[] = (game as any).recent_commits ?? []

  const openPRs: PRItem[] = (game as any).open_prs ?? []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
      {/* Left column */}
      <div className="col gap-20">
        {/* Milestones */}
        <section className="card glow-violet fade-up d-0">
          <div className="row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 15 }}>Milestones</h3>
            <div className="spacer" />
            <span className="t-mono t-xs t-muted">plan.md</span>
          </div>
          <div style={{ padding: 4 }}>
            {milestones.length === 0 && (
              <div className="t-sm t-muted" style={{ padding: '16px 20px' }}>No milestones yet.</div>
            )}
            {milestones.map((m, i) => (
              <div
                key={i}
                className="row"
                style={{ padding: '14px 20px', gap: 16, borderTop: i ? '1px solid var(--border)' : 'none' }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: '1px solid ' + (m.active ? 'var(--accent)' : 'var(--border-2)'),
                  background: m.done ? 'var(--accent)' : m.active ? 'var(--accent-wash)' : 'transparent',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  {m.done && (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <polyline points="2,7 5,10 11,3" stroke="#0A0A0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {m.active && <span className="dot dot-live" style={{ width: 6, height: 6 }} />}
                </div>
                <div className="col" style={{ flex: 1 }}>
                  <div className="row">
                    <span className="t-display" style={{ fontSize: 14, color: m.done ? 'var(--muted)' : 'var(--ink)' }}>
                      {m.label}
                    </span>
                    <div className="spacer" />
                    <span className="t-mono t-xs" style={{ color: m.active ? 'var(--accent-soft)' : 'var(--muted)' }}>
                      {m.pct}%
                    </span>
                  </div>
                  <div className="row gap-12" style={{ marginTop: 6 }}>
                    <div className="bar" style={{ flex: 1 }}>
                      <div className="fill" style={{ width: `${m.pct}%`, background: m.done ? 'var(--success)' : undefined }} />
                    </div>
                    <span className="t-xs t-muted" style={{ minWidth: 160, textAlign: 'right' }}>{m.notes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Blockers */}
        <section className="card fade-up d-1" style={{ borderColor: 'rgba(255,74,110,0.3)' }}>
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,74,110,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 style={{ fontSize: 14, marginLeft: 8 }}>Blockers · {blockers.length}</h3>
            <div className="spacer" />
            <span className="t-mono t-xs t-muted">memory/blockers.md</span>
          </div>
          {blockers.length === 0 ? (
            <div className="t-sm t-muted" style={{ padding: '14px 20px' }}>No open blockers.</div>
          ) : (
            <div style={{ padding: '14px 20px' }}>
              {blockers.map((b, i) => (
                <div
                  key={b.id}
                  className="row gap-12"
                  style={{ alignItems: 'flex-start', marginTop: i ? 16 : 0, paddingTop: i ? 16 : 0, borderTop: i ? '1px solid rgba(255,74,110,0.15)' : 'none' }}
                >
                  <span className="chip chip-danger" style={{ marginTop: 2 }}>{b.id}</span>
                  <div className="col flex-1">
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.title}</div>
                    <div className="t-sm t-muted">{b.description}</div>
                    <div className="row gap-12" style={{ marginTop: 10 }}>
                      {b.opened_by && (
                        <span className="t-mono t-xs t-muted">opened by {b.opened_by}</span>
                      )}
                      {b.age && <span className="t-mono t-xs t-muted">{b.age}</span>}
                    </div>
                  </div>
                  <div className="col gap-6">
                    <button className="btn btn-sm btn-primary">Resolve</button>
                    <button className="btn btn-sm btn-ghost">Snooze</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent commits */}
        <section className="card fade-up d-2">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Recent commits</h3>
            <div className="spacer" />
            <span className="t-mono t-xs t-muted">feature/*</span>
          </div>
          {recentCommits.length === 0 ? (
            <div className="t-sm t-muted" style={{ padding: '14px 20px' }}>No recent commits.</div>
          ) : (
            <div>
              {recentCommits.map((c, i) => (
                <div
                  key={i}
                  className="row gap-12"
                  style={{ padding: '11px 20px', borderTop: i ? '1px solid var(--border)' : 'none' }}
                >
                  <span className="t-mono t-xs t-muted" style={{ width: 28 }}>{c.t}</span>
                  <span className="t-mono t-xs t-accent" style={{ width: 60 }}>{c.sha}</span>
                  <span className="t-sm flex-1" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.msg}
                  </span>
                  <span className="chip">{c.branch}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right sidebar */}
      <div className="col gap-20">
        {/* Sprint donut */}
        <section className="card card-pad fade-up d-1" style={{ position: 'relative' }}>
          <div className="text-cap">This sprint</div>
          <div className="row gap-16" style={{ alignItems: 'center', marginTop: 12 }}>
            <Donut pct={sprintPct} />
            <div className="col gap-2">
              <div className="t-display" style={{ fontSize: 28 }}>{tasksDone} / {taskCount}</div>
              <div className="t-xs t-muted">tasks done</div>
              {(game as any).active_task && (
                <div className="t-xs t-accent" style={{ marginTop: 8 }}>
                  ● {(game as any).active_task}
                </div>
              )}
            </div>
          </div>
          <div className="divider" />
          <div className="col gap-6">
            {([
              ['Milestones done', `${game.milestones_done} / ${game.milestone_count}`],
              ['Open PRs', String(game.open_pr_count)],
              ['Blockers', String(game.blocker_count)],
              ['Last run', game.last_run_at ? new Date(game.last_run_at).toLocaleString() : '—'],
            ] as [string, string][]).map(([l, v], i) => (
              <div key={i} className="row">
                <span className="t-xs t-muted">{l}</span>
                <div className="spacer" />
                <span className="t-mono t-xs t-dim">{v}</span>
              </div>
            ))}
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
            onClick={() => navigate(ROUTES.run(gameSlug))}
          >
            Open Live Run
          </button>
        </section>

        {/* File quick-links */}
        <section className="card fade-up d-2">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Files</h3>
          </div>
          <div>
            {([
              ['plan.md', `games/${gameSlug}/plan.md`],
              ['sprint-log.md', `games/${gameSlug}/sprint-log.md`],
              ['spec.md', `games/${gameSlug}/spec.md`],
              ['progress.md', `games/${gameSlug}/progress.md`],
            ] as [string, string][]).map(([label, path], i) => (
              <div
                key={i}
                className="row gap-10"
                style={{ padding: '10px 20px', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
              >
                <FileIcon />
                <div className="col" style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-sm">{label}</div>
                  <div className="t-mono t-xs t-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {path}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PRs mini-list */}
        <section className="card fade-up d-3">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>PRs open · {game.open_pr_count}</h3>
            <div className="spacer" />
            <span className="t-mono t-xs t-muted">github</span>
          </div>
          {openPRs.length === 0 ? (
            <div className="t-sm t-muted" style={{ padding: '12px 20px' }}>No open PRs.</div>
          ) : (
            <div>
              {openPRs.map((pr, i) => (
                <div key={pr.number} style={{ padding: '12px 20px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <div className="row gap-8">
                    <span className={`dot ${pr.state === 'approved' ? 'dot-success' : pr.state === 'QA' ? 'dot-warning' : 'dot-accent'}`} />
                    <span className={`t-mono t-xs ${pr.state === 'approved' ? 't-success' : pr.state === 'QA' ? 't-warning' : 't-accent'}`}>
                      {pr.state}
                    </span>
                    <span className="t-sm">#{pr.number} · {pr.title}</span>
                  </div>
                  {pr.detail && (
                    <div className="t-xs t-muted" style={{ marginTop: 4, marginLeft: 16 }}>{pr.detail}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { id: TabKey; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'plan', label: 'Plan' },
  { id: 'sprint', label: 'Sprint log' },
  { id: 'progress', label: 'Progress' },
  { id: 'prs', label: 'PRs' },
  { id: 'reports', label: 'Reports' },
  { id: 'overrides', label: 'Overrides' },
]

function humanize(slug: string): string {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function GameDetail() {
  const { game: gameSlug } = useParams<{ game: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('overview')

  if (!gameSlug) {
    return <div style={{ padding: 32, color: 'var(--danger)', fontFamily: 'var(--f-mono)' }}>Missing game parameter.</div>
  }

  const { data: game, isLoading, error } = useGame(gameSlug)

  if (isLoading) {
    return <div style={{ padding: 32, color: 'var(--muted)', fontFamily: 'var(--f-mono)', fontSize: 13 }}>Loading game…</div>
  }

  if (error || !game) {
    return (
      <div style={{ padding: 32 }}>
        <button className="btn btn-ghost" onClick={() => navigate(ROUTES.projects)} style={{ marginBottom: 16 }}>
          ← Projects
        </button>
        <div style={{ color: 'var(--danger)', fontFamily: 'var(--f-mono)', fontSize: 13 }}>Game not found or failed to load.</div>
      </div>
    )
  }

  const sprintN = game.current_sprint ?? '?'
  const prCount = game.open_pr_count
  const overrideCount = (game as any).override_count as number | undefined

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="t-mono t-xs t-muted" style={{ marginBottom: 4 }}>Game · sprint {sprintN}</div>
          <h1>{humanize(game.name || gameSlug)}</h1>
          <div className="lead">{(game as any).description ?? `${game.slug} · ${game.registry_status}`}</div>
        </div>
        <div className="row gap-8">
          <button className="btn" onClick={() => navigate(ROUTES.edit(gameSlug))}>
            Live edit
          </button>
          <button className="btn" onClick={() => navigate(ROUTES.gameRepo(gameSlug))}>
            Open repo
          </button>
          <button className="btn btn-primary" onClick={() => navigate(ROUTES.run(gameSlug))}>
            Run now
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <div
            key={t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'prs' && prCount > 0 && (
              <span className="chip chip-accent" style={{ marginLeft: 6, padding: '0 6px', fontSize: 10 }}>{prCount}</span>
            )}
            {t.id === 'overrides' && overrideCount != null && overrideCount > 0 && (
              <span className="chip" style={{ marginLeft: 6, padding: '0 6px', fontSize: 10 }}>{overrideCount}</span>
            )}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab game={game} gameSlug={gameSlug} />}
      {tab === 'plan' && (
        <PlaceholderTab title="Plan" file={`games/${gameSlug}/plan.md`} />
      )}
      {tab === 'sprint' && (
        <PlaceholderTab title="Sprint log" file={`games/${gameSlug}/sprint-log.md`} />
      )}
      {tab === 'progress' && (
        <PlaceholderTab title="Progress" file={`games/${gameSlug}/progress.md`} tail />
      )}
      {tab === 'prs' && (
        <PlaceholderTab title="Pull requests" file="gh pr list" />
      )}
      {tab === 'reports' && (
        <PlaceholderTab title="Reports" file="reports/morning/*.md" />
      )}
      {tab === 'overrides' && (
        <PlaceholderTab title="Overrides" file={`games/${gameSlug}/memory/human-overrides.md`} />
      )}
    </div>
  )
}
