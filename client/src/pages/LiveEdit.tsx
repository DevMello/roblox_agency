import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGame } from '../hooks/useGames'

// ── types ─────────────────────────────────────────────────────────────────────

type Priority = 'normal' | 'high' | 'blocking'
type Target = 'Current sprint' | 'Next sprint' | 'Backlog'

interface Reply {
  who: string
  text: string
}

interface OverrideEntry {
  when: string
  you: string
  priority: Priority
  branch: string
  pr: string
  status: { tone: string; label: string }
  replies: Reply[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

const API = '/api/v1'

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `POST ${url} → ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.json() as Promise<T>
}

function agentColor(who: string): string {
  const map: Record<string, string> = {
    planner: '#A89CFF',
    builder: '#7C6FFF',
    QA: '#FFB547',
    reporter: '#00E5A0',
  }
  return map[who] ?? '#6E6C85'
}

// ── sub-components ────────────────────────────────────────────────────────────

function Avatar({ who }: { who: string }) {
  const color = who === 'you' ? '#444' : agentColor(who)
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8,
      background: who === 'you' ? 'var(--surface-3)' : `linear-gradient(135deg, ${color}, ${color}99)`,
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12,
      color: who === 'you' ? 'var(--ink-dim)' : '#0A0A0F', flexShrink: 0,
    }}>
      {who === 'you' ? 'Y' : who[0].toUpperCase()}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      onClick={onChange}
      style={{
        width: 32, height: 18, borderRadius: 999,
        background: checked ? 'var(--accent)' : 'var(--surface-3)',
        position: 'relative', transition: 'background 150ms',
        cursor: 'pointer', display: 'inline-block', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 16 : 2,
        width: 14, height: 14, borderRadius: 999,
        background: checked ? '#0A0A0F' : 'var(--ink-dim)',
        transition: 'left 150ms',
      }} />
    </span>
  )
}

// ── main component ────────────────────────────────────────────────────────────

const DRAFT = "Remove the VIP door from zone 3. Replace it with a regular door, but add a speed-boost pad nearby that's only accessible to gamepass holders."

const QUICK_CHIPS = [
  'Fix balance on zone 3 jumps',
  'Add a daily login reward',
  'Rebalance gamepass prices',
  'Add particle on currency pickup',
]

const TIPS: [string, string, string][] = [
  ['✦', 'Describe outcomes, not implementation.', '"Make jumps feel snappier" beats "set jumpHeight=12".'],
  ['✦', 'One ask per override.', 'Multiple asks get split anyway; you lose tracking.'],
  ['✦', 'Reference files if you know them.', 'Mention plan.md, sprint-log.md, or a zone name.'],
]

export default function LiveEdit() {
  const { game = '' } = useParams<{ game: string }>()
  const { data: gameData } = useGame(game)

  const [text, setText] = useState('')
  const [priority, setPriority] = useState<Priority>('high')
  const [target, setTarget] = useState<Target>('Current sprint')
  const [runNow, setRunNow] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<OverrideEntry[]>([])

  useEffect(() => {
    if (!game) return
    apiGet<{ entries: OverrideEntry[] }>(`${API}/edits/history/${game}`)
      .then(d => setHistory(d.entries ?? []))
      .catch(() => setHistory([]))
  }, [game])

  const handleSubmit = async () => {
    if (!text.trim()) { setError('Override text cannot be empty.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await apiPost<{ saved: boolean }>(`${API}/edits/${game}`, {
        text: text.trim(),
        priority,
        target,
        run_now: runNow,
        apply_immediately: runNow,
      })
      setText('')
      const d = await apiGet<{ entries: OverrideEntry[] }>(`${API}/edits/history/${game}`)
      setHistory(d.entries ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const now = new Date().toISOString()
  const previewText = text || DRAFT

  const contextRows: [string, string][] = [
    ['Status', gameData ? gameData.status : 'idle · next cycle 23:00'],
    ['Sprint', gameData ? `${gameData.nights_elapsed} · ${gameData.milestones_done}/${gameData.milestone_count} milestones` : '—'],
    ['Blockers', gameData ? String(gameData.blocker_count) : '—'],
    ['Workers', '—'],
  ]

  return (
    <div className="page" style={{ height: '100%', overflowY: 'auto' }}>
      {/* ── breadcrumb ── */}
      <div className="crumbs" style={{ marginBottom: 16 }}>
        <Link to="/projects" className="crumb root">Projects</Link>
        <span className="sep">/</span>
        <Link to={`/projects/${game}`} className="crumb">{game}</Link>
        <span className="sep">/</span>
        <span className="crumb last">Live edit</span>
      </div>

      {/* ── page head ── */}
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="text-cap" style={{ marginBottom: 6 }}>Human override</div>
          <h1 style={{ fontSize: 28 }}>
            Tell <span style={{ color: 'var(--accent-soft)' }}>{game}</span> what to change
          </h1>
          <div className="lead">
            Plain language → memory/human-overrides.md → planner picks it up next cycle. Or hit 'run now' to dispatch immediately.
          </div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-sm btn-ghost">View memory file</button>
          <button className="btn btn-sm">All overrides</button>
        </div>
      </div>

      {/* ── error banner ── */}
      {error && (
        <div style={{
          padding: '10px 16px', marginBottom: 16, borderRadius: 8, fontSize: 13,
          background: 'var(--danger-soft)', border: '1px solid rgba(255,74,110,0.25)', color: 'var(--danger)',
          fontFamily: 'var(--f-mono)',
        }}>
          {error}
        </div>
      )}

      {/* ── 2-column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* LEFT — conversation column */}
        <div className="col gap-16">

          {/* Composer */}
          <section className="card glow-violet fade-up d-0" style={{ padding: 18 }}>
            <div className="row gap-8" style={{ marginBottom: 12 }}>
              <span className="t-accent" style={{ fontSize: 14 }}>✦</span>
              <span className="t-display" style={{ fontSize: 15 }}>New override</span>
              <div className="spacer" />
              <span className="kbd">⌘↵ to send</span>
            </div>

            <textarea
              className="field field-lg"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={DRAFT}
              rows={5}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  void handleSubmit()
                }
              }}
            />

            <div className="row gap-16" style={{ marginTop: 14, flexWrap: 'wrap' }}>
              {/* Priority */}
              <div className="col">
                <span className="label-cap">Priority</span>
                <div className="row gap-4">
                  {(['normal', 'high', 'blocking'] as Priority[]).map(p => (
                    <button
                      key={p}
                      className={`btn btn-sm ${priority === p ? (p === 'blocking' ? '' : 'btn-primary') : 'btn-ghost'}`}
                      onClick={() => setPriority(p)}
                      style={priority === p && p === 'blocking'
                        ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#0A0A0F', fontWeight: 700 }
                        : undefined}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target */}
              <div className="col">
                <span className="label-cap">Target</span>
                <select
                  className="field"
                  style={{ minWidth: 160 }}
                  value={target}
                  onChange={e => setTarget(e.target.value as Target)}
                >
                  <option>Current sprint</option>
                  <option>Next sprint</option>
                  <option>Backlog</option>
                </select>
              </div>

              {/* Dispatch */}
              <div className="col">
                <span className="label-cap">Dispatch</span>
                <label className="row gap-6" style={{ cursor: 'pointer' }}>
                  <Toggle checked={runNow} onChange={() => setRunNow(v => !v)} />
                  <span className="t-sm">Run immediately</span>
                </label>
              </div>

              <div className="spacer" />
              <div className="row gap-8" style={{ alignSelf: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setText('')}>Save draft</button>
                <button
                  className="btn btn-primary"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? 'Submitting…' : '↑ Submit override'}
                </button>
              </div>
            </div>

            {/* Quick chips */}
            <div className="row gap-8" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)', flexWrap: 'wrap' }}>
              <span className="text-cap" style={{ marginBottom: 0 }}>Quick:</span>
              {QUICK_CHIPS.map(q => (
                <button key={q} className="chip" style={{ cursor: 'pointer' }} onClick={() => setText(q)}>{q}</button>
              ))}
            </div>
          </section>

          {/* History */}
          <div className="col gap-20">
            <div className="row" style={{ paddingLeft: 4 }}>
              <span className="text-cap">Recent overrides · {history.length}</span>
              <div className="spacer" />
              <span className="t-mono t-xs t-muted">history → memory/human-overrides.md</span>
            </div>

            {history.length === 0 && (
              <div style={{
                padding: 20, textAlign: 'center', color: 'var(--muted)',
                fontSize: 13, fontFamily: 'var(--f-mono)',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
              }}>
                No overrides yet for {game}.
              </div>
            )}

            {history.map((h, hi) => (
              <div key={hi} className={`fade-up d-${Math.min(hi + 1, 4)}`}>
                {/* User message */}
                <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
                  <Avatar who="you" />
                  <div className="col flex-1">
                    <div className="row gap-8">
                      <span className="t-display" style={{ fontSize: 13 }}>you</span>
                      <span className="t-mono t-xs t-muted">{h.when}</span>
                      <span className={`chip ${h.priority === 'high' ? 'chip-warning' : h.priority === 'blocking' ? 'chip-danger' : ''}`}>
                        {h.priority}
                      </span>
                      <div className="spacer" />
                      <span className={`chip chip-${h.status.tone}`}>{h.status.label}</span>
                    </div>
                    <div className="card card-pad" style={{ marginTop: 8, background: 'var(--surface)' }}>
                      <div className="t-md">{h.you}</div>
                      <div className="row gap-10" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                        <span style={{ width: 12, height: 12, color: 'var(--muted)', fontSize: 12 }}>⎇</span>
                        <span className="t-mono t-xs t-dim">{h.branch}</span>
                        {h.pr && <span className="chip">{h.pr}</span>}
                        <div className="spacer" />
                        <button className="btn btn-sm btn-ghost">View diff</button>
                        <button className="btn btn-sm btn-ghost">Re-run</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent replies */}
                {h.replies.map((r, ri) => (
                  <div key={ri} className="row gap-12" style={{ alignItems: 'flex-start', marginTop: 10, marginLeft: 24 }}>
                    <Avatar who={r.who} />
                    <div className="col flex-1">
                      <div className="row gap-8">
                        <span className="t-display" style={{ fontSize: 13, color: agentColor(r.who) }}>{r.who}</span>
                        <span className="t-mono t-xs t-muted">{h.when}</span>
                      </div>
                      <div style={{ marginTop: 6, padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div className="t-sm t-dim">{r.text}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — context column */}
        <div className="col gap-16">

          {/* Game context */}
          <section className="card fade-up d-1">
            <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 13 }}>Game context</h3>
              <div className="spacer" />
              <span className="dot dot-muted" />
            </div>
            <div className="col" style={{ padding: '12px 16px' }}>
              {contextRows.map(([label, val], i) => (
                <div key={label} className="row" style={{ padding: '7px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <span className="t-xs t-muted">{label}</span>
                  <div className="spacer" />
                  <span className="t-mono t-xs t-dim">{val}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Tips */}
          <section className="card fade-up d-2">
            <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 13 }}>Tips for good overrides</h3>
            </div>
            <div className="col gap-10" style={{ padding: '14px 16px' }}>
              {TIPS.map(([marker, title, sub], i) => (
                <div key={i} className="row gap-8" style={{ alignItems: 'flex-start' }}>
                  <span className="t-accent" style={{ marginTop: 2 }}>{marker}</span>
                  <div className="col">
                    <div className="t-sm">{title}</div>
                    <div className="t-xs t-muted">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Preview */}
          <section className="card fade-up d-3" style={{ padding: 16 }}>
            <div className="text-cap">This becomes</div>
            <div className="t-mono t-xs t-dim" style={{
              marginTop: 6, lineHeight: 1.5,
              background: 'var(--bg)', padding: 10,
              borderRadius: 6, border: '1px solid var(--border)',
            }}>
              <span className="t-muted">## OVERRIDE {now.slice(0, 19)}</span><br />
              <span className="t-muted">Priority: </span>{priority}<br />
              <span className="t-muted">Target: </span>{target.toLowerCase()}<br />
              <span className="t-muted">Request: </span>"{previewText}"
            </div>
            <div className="t-xs t-muted" style={{ marginTop: 8 }}>
              Appended to <span className="t-mono">memory/human-overrides.md</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
