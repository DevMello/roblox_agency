import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useGame } from '../hooks/useGames'
import { ROUTES } from '../router'
import type { Game } from '../types'
import { fetchJson, API } from '../utils/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'plan' | 'sprint' | 'progress' | 'reports' | 'overrides'

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

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const tone =
    status === 'done' || status === 'complete' || status === 'resolved' ? 'success'
    : status === 'in-progress' || status === 'active' || status === 'running' ? 'accent'
    : status === 'failed' ? 'danger'
    : status === 'qa-failed' ? 'danger'
    : ''
  return <span className={`chip${tone ? ` chip-${tone}` : ''}`}>{status}</span>
}

// ── Plan Tab ──────────────────────────────────────────────────────────────────

function PlanTab({ gameSlug }: { gameSlug: string }) {
  const { data, isLoading } = useQuery<{ milestones: any[]; tasks: any[] }>({
    queryKey: ['plan', gameSlug],
    queryFn: () => fetchJson(`${API}/games/${gameSlug}/plan`),
  })

  if (isLoading) return <div className="t-sm t-muted" style={{ padding: 24 }}>Loading plan…</div>
  if (!data) return <div className="t-sm t-muted" style={{ padding: 24 }}>No plan data.</div>

  const { milestones = [], tasks = [] } = data

  return (
    <div className="col gap-16">
      <section className="card">
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14 }}>Milestones · {milestones.length}</h3>
        </div>
        {milestones.length === 0
          ? <div className="t-sm t-muted" style={{ padding: '14px 20px' }}>No milestones yet.</div>
          : milestones.map((m: any, i: number) => (
            <div key={m.id} className="row gap-12" style={{ padding: '12px 20px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <StatusChip status={m.status ?? 'pending'} />
              <div className="col flex-1">
                <span className="t-sm" style={{ fontWeight: 500 }}>{m.title}</span>
                {m.goal && <span className="t-xs t-muted" style={{ marginTop: 2 }}>{m.goal}</span>}
              </div>
              {m.estimated_nights != null && (
                <span className="t-mono t-xs t-muted">{m.estimated_nights}n est</span>
              )}
            </div>
          ))
        }
      </section>

      <section className="card">
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14 }}>Tasks · {tasks.length}</h3>
        </div>
        {tasks.length === 0
          ? <div className="t-sm t-muted" style={{ padding: '14px 20px' }}>No tasks yet.</div>
          : tasks.map((t: any, i: number) => (
            <div key={t.task_id} className="row gap-12" style={{ padding: '11px 20px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <StatusChip status={t.status ?? 'pending'} />
              <span className="t-mono t-xs t-muted" style={{ width: 80, flexShrink: 0 }}>{t.task_id}</span>
              <span className="t-sm flex-1">{t.title}</span>
              {t.assignee && <span className="chip">{t.assignee}</span>}
              {t.estimated_minutes && <span className="t-mono t-xs t-muted">{t.estimated_minutes}m</span>}
            </div>
          ))
        }
      </section>
    </div>
  )
}

// ── Sprint Tab ────────────────────────────────────────────────────────────────

function SprintTab({ gameSlug }: { gameSlug: string }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<any>({
    queryKey: ['sprint', gameSlug],
    queryFn: () => fetchJson(`${API}/games/${gameSlug}/sprint-log`),
    retry: false,
  })

  const patchTask = useMutation({
    mutationFn: ({ sprintId, taskId, status }: { sprintId: string; taskId: string; status: string }) =>
      fetchJson<void>(`${API}/games/${gameSlug}/sprint-log/${sprintId}/tasks/${taskId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sprint', gameSlug] }),
  })

  if (isLoading) return <div className="t-sm t-muted" style={{ padding: 24 }}>Loading sprint log…</div>
  if (!data) return <div className="t-sm t-muted" style={{ padding: 24 }}>No sprint data.</div>

  const tasks: any[] = data.tasks ?? []
  const done = tasks.filter(t => t.status === 'done').length

  return (
    <div className="col gap-16">
      <section className="card">
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14 }}>{data.sprint_id ?? 'Latest sprint'}</h3>
          <div className="spacer" />
          <StatusChip status={data.status ?? 'unknown'} />
          <span className="t-mono t-xs t-muted" style={{ marginLeft: 12 }}>{data.date ?? ''}</span>
        </div>
        <div className="row gap-16" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          {[
            ['Milestone', data.milestone_ref ?? '—'],
            ['Tasks', `${done} / ${tasks.length} done`],
            ['Est. minutes', data.total_estimated_minutes ?? '—'],
          ].map(([l, v]) => (
            <div key={l} className="col">
              <span className="text-cap" style={{ fontSize: 9 }}>{l}</span>
              <span className="t-mono t-sm">{v}</span>
            </div>
          ))}
        </div>
        {tasks.map((t: any, i: number) => (
          <div key={t.task_id ?? i} className="row gap-12" style={{ padding: '11px 20px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <StatusChip status={t.status ?? 'pending'} />
            <span className="t-mono t-xs t-muted" style={{ width: 80, flexShrink: 0 }}>{t.task_id}</span>
            <span className="t-sm flex-1">{t.title}</span>
            {t.assigned_agent && <span className="chip">{t.assigned_agent}</span>}
            {t.qa_verdict && <StatusChip status={`qa-${t.qa_verdict}`} />}
            {t.pr_reference && (
              <a href={t.pr_reference} target="_blank" rel="noreferrer" className="t-mono t-xs t-accent">PR</a>
            )}
            <select
              className="field"
              style={{ padding: '2px 6px', fontSize: 11, height: 24, width: 90 }}
              value={t.status ?? 'pending'}
              onChange={e => patchTask.mutate({ sprintId: data.sprint_id, taskId: t.task_id, status: e.target.value })}
            >
              {['pending','in-progress','done','failed','blocked'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </section>
    </div>
  )
}

// ── Progress Tab ──────────────────────────────────────────────────────────────

function ProgressTab({ gameSlug }: { gameSlug: string }) {
  const { data, isLoading, refetch } = useQuery<{ entries: any[] }>({
    queryKey: ['progress', gameSlug],
    queryFn: () => fetchJson(`${API}/games/${gameSlug}/progress`),
    refetchInterval: 10_000,
  })

  const entries = data?.entries ?? []

  return (
    <div className="col gap-16">
      <section className="card">
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14 }}>Progress log · {entries.length} entries</h3>
          <div className="spacer" />
          <button className="btn btn-sm btn-ghost" onClick={() => void refetch()}>Refresh</button>
        </div>
        {isLoading && <div className="t-sm t-muted" style={{ padding: '14px 20px' }}>Loading…</div>}
        {entries.length === 0 && !isLoading && (
          <div className="t-sm t-muted" style={{ padding: '14px 20px' }}>No progress entries yet.</div>
        )}
        {entries.map((e: any, i: number) => (
          <div key={e.id ?? i} className="row gap-12" style={{ padding: '11px 20px', borderTop: i ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
            <span className="t-mono t-xs t-muted" style={{ width: 120, flexShrink: 0, marginTop: 2 }}>
              {e.created_at ? new Date(e.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
            <span className="chip" style={{ flexShrink: 0 }}>{e.agent ?? 'system'}</span>
            {e.task_id && <span className="t-mono t-xs t-muted" style={{ flexShrink: 0 }}>{e.task_id}</span>}
            <span className="t-sm flex-1">{e.message}</span>
          </div>
        ))}
      </section>
    </div>
  )
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab() {
  const [selected, setSelected] = useState<string | null>(null)

  const { data: files = [], isLoading } = useQuery<{ name: string; path?: string }[]>({
    queryKey: ['dirs', 'reports/morning'],
    queryFn: () => fetchJson<{ name: string; path?: string }[]>(`${API}/files/dirs/reports/morning`).catch(() => []),
  })

  const { data: fileData } = useQuery<{ content: string }>({
    queryKey: ['file', selected],
    queryFn: () => fetchJson(`/api/v1/files/${selected}`),
    enabled: !!selected,
  })

  const reports = files.filter((f: any) => (f.name ?? f.path ?? '').endsWith('.md')).reverse()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
      <section className="card" style={{ alignSelf: 'flex-start' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 13 }}>Morning reports</h3>
        </div>
        {isLoading && <div className="t-sm t-muted" style={{ padding: 12 }}>Loading…</div>}
        {reports.length === 0 && !isLoading && (
          <div className="t-sm t-muted" style={{ padding: 12 }}>No reports yet.</div>
        )}
        {reports.map((f: any, i: number) => {
          const name: string = f.name ?? f.path ?? ''
          const path: string = f.path ?? `reports/morning/${name}`
          return (
            <div
              key={name}
              onClick={() => setSelected(path)}
              className="card-hover"
              style={{ padding: '9px 16px', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: selected === path ? 'rgba(124,111,255,0.08)' : undefined }}
            >
              <span className="t-mono t-xs" style={{ color: selected === path ? 'var(--accent)' : 'var(--ink-dim)' }}>
                {name.replace(/\.md$/, '')}
              </span>
            </div>
          )
        })}
      </section>
      <section className="card">
        {!selected && <div className="t-sm t-muted" style={{ padding: 24 }}>Select a report to read.</div>}
        {selected && !fileData && <div className="t-sm t-muted" style={{ padding: 24 }}>Loading…</div>}
        {fileData && (
          <pre style={{ margin: 0, padding: 20, fontSize: 12, fontFamily: 'var(--f-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--ink-dim)', lineHeight: 1.6 }}>
            {fileData.content}
          </pre>
        )}
      </section>
    </div>
  )
}

// ── Overrides Tab ─────────────────────────────────────────────────────────────

function OverridesTab({ gameSlug }: { gameSlug: string }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ entries: any[] }>({
    queryKey: ['overrides', gameSlug],
    queryFn: () => fetchJson(`${API}/games/${gameSlug}/overrides`),
  })

  const [showForm, setShowForm] = useState(false)
  const [newText, setNewText] = useState('')

  const addOverride = useMutation({
    mutationFn: (text: string) =>
      fetchJson<void>(`${API}/games/${gameSlug}/overrides`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['overrides', gameSlug] }); setNewText(''); setShowForm(false) },
  })

  const entries: any[] = data?.entries ?? []

  return (
    <div className="col gap-16">
      <section className="card">
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14 }}>Human overrides · {entries.length}</h3>
          <div className="spacer" />
          <button className="btn btn-sm btn-ghost" onClick={() => setShowForm(f => !f)}>+ Add override</button>
        </div>
        {showForm && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <textarea
              className="field"
              rows={3}
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Describe the override decision…"
              style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--f-mono)', fontSize: 12 }}
            />
            <div className="row gap-8" style={{ marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => addOverride.mutate(newText)} disabled={!newText.trim() || addOverride.isPending}>
                {addOverride.isPending ? 'Saving…' : 'Save override'}
              </button>
            </div>
          </div>
        )}
        {isLoading && <div className="t-sm t-muted" style={{ padding: '14px 20px' }}>Loading…</div>}
        {entries.length === 0 && !isLoading && (
          <div className="t-sm t-muted" style={{ padding: '14px 20px' }}>No overrides recorded.</div>
        )}
        {entries.map((e: any, i: number) => (
          <div key={e.id ?? i} style={{ padding: '12px 20px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <div className="row gap-10">
              <StatusChip status={e.status ?? 'active'} />
              {e.type && <span className="chip">{e.type}</span>}
              {e.requested_by && <span className="t-xs t-muted">by {e.requested_by}</span>}
              <div className="spacer" />
              <span className="t-mono t-xs t-muted">
                {e.created_at ? new Date(e.created_at).toLocaleDateString() : ''}
              </span>
            </div>
            <div className="t-sm" style={{ marginTop: 8 }}>{e.request}</div>
          </div>
        ))}
      </section>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ game, gameSlug }: { game: Game; gameSlug: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: blockersRaw, refetch: refetchBlockers } = useQuery<Blocker[]>({
    queryKey: ['blockers', gameSlug],
    queryFn: () => fetchJson<Blocker[]>(`${API}/games/${gameSlug}/blockers`),
  })

  const blockers: Blocker[] = blockersRaw ?? []

  const resolveBlocker = useMutation({
    mutationFn: (blockerId: string) =>
      fetchJson<void>(`${API}/games/${gameSlug}/blockers/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocker_ids: [blockerId] }),
      }),
    onSuccess: () => { void refetchBlockers(); void qc.invalidateQueries({ queryKey: ['game', gameSlug] }) },
  })

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
  const taskCount: number = game.tasks_total ?? 0
  const sprintPct: number = taskCount > 0 ? Math.round((tasksDone / taskCount) * 100) : 0

  const recentCommits: CommitItem[] = (game as any).recent_commits ?? []

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
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={resolveBlocker.isPending}
                      onClick={() => resolveBlocker.mutate(b.id)}
                    >
                      {resolveBlocker.isPending ? '…' : 'Resolve'}
                    </button>
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
              ['Blockers', String(game.blocker_count)],
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

  const overrideCount = (game as any).override_count as number | undefined

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="t-mono t-xs t-muted" style={{ marginBottom: 4 }}>Game · sprint {game.nights_elapsed}</div>
          <h1>{humanize(game.name || gameSlug)}</h1>
          <div className="lead">{(game as any).description ?? `${game.slug} · ${game.status}`}</div>
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
            {t.id === 'overrides' && overrideCount != null && overrideCount > 0 && (
              <span className="chip" style={{ marginLeft: 6, padding: '0 6px', fontSize: 10 }}>{overrideCount}</span>
            )}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab game={game} gameSlug={gameSlug} />}
      {tab === 'plan' && <PlanTab gameSlug={gameSlug} />}
      {tab === 'sprint' && <SprintTab gameSlug={gameSlug} />}
      {tab === 'progress' && <ProgressTab gameSlug={gameSlug} />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'overrides' && <OverridesTab gameSlug={gameSlug} />}
    </div>
  )
}
