// Page · /repo — Repo Explorer (grid map + ⌘K palette)
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Static data ──────────────────────────────────────────────────────────────

const REPO_NODES = [
  { id: 'agents', label: 'agents', x: 0, y: 0, w: 3, h: 2, locked: true, count: 14, kind: 'dir' as const },
  { id: 'config', label: 'config', x: 3, y: 0, w: 2, h: 2, count: 8, kind: 'dir' as const },
  { id: 'games', label: 'games', x: 5, y: 0, w: 4, h: 4, count: 3, kind: 'dir' as const, accent: true, hero: true },
  { id: 'workflows', label: 'workflows', x: 9, y: 0, w: 3, h: 2, count: 11, kind: 'dir' as const, locked: true },
  { id: 'memory', label: 'memory', x: 0, y: 2, w: 3, h: 2, count: 4, kind: 'dir' as const, recent: true },
  { id: 'logs', label: 'logs', x: 3, y: 2, w: 2, h: 2, count: 47, kind: 'dir' as const },
  { id: 'arch', label: 'architecture.md', x: 9, y: 2, w: 3, h: 1, kind: 'file' as const },
  { id: 'claude', label: 'CLAUDE.md', x: 9, y: 3, w: 3, h: 1, kind: 'file' as const },
  { id: 'specs', label: 'specs', x: 0, y: 4, w: 3, h: 2, count: 3, kind: 'dir' as const },
  { id: 'reports', label: 'reports', x: 3, y: 4, w: 2, h: 2, count: 12, kind: 'dir' as const },
  { id: 'scripts', label: 'scripts', x: 5, y: 4, w: 4, h: 1, count: 8, kind: 'dir' as const, locked: true },
  { id: 'mcp', label: '.mcp.json', x: 5, y: 5, w: 2, h: 1, kind: 'file' as const },
  { id: 'env', label: '.env', x: 7, y: 5, w: 2, h: 1, kind: 'file' as const, locked: true },
  { id: 'webui', label: 'webui', x: 9, y: 4, w: 3, h: 2, count: 84, kind: 'dir' as const },
]

const GAME_CHILDREN = [
  { label: 'industrial-tycoon', pct: 78, status: 'building' as const },
  { label: 'sword-game', pct: 18, status: 'idle' as const },
  { label: 'lava-escape', pct: 4, status: 'planning' as const },
]

const PALETTE_RESULTS = [
  { path: 'games/industrial-tycoon/plan.md', type: 'markdown' },
  { path: 'games/industrial-tycoon/sprint-log.md', type: 'markdown' },
  { path: 'games/sword-game/plan.md', type: 'markdown' },
  { path: 'games/lava-escape/plan.md', type: 'markdown' },
  { path: 'memory/blockers.md', type: 'markdown' },
  { path: 'memory/human-overrides.md', type: 'markdown' },
  { path: 'specs/industrial-tycoon/spec.md', type: 'markdown' },
  { path: 'architecture.md', type: 'markdown' },
  { path: 'reports/morning/2026-05-19.md', type: 'markdown' },
  { path: '.mcp.json', type: 'json' },
]

const RECENT_FILES = [
  { p: 'games/industrial-tycoon/sprint-log.md', t: '2m ago', who: 'builder', op: 'modified' },
  { p: 'memory/human-overrides.md', t: '9m ago', who: 'you', op: 'appended' },
  { p: 'games/industrial-tycoon/progress.md', t: '12m ago', who: 'builder', op: 'modified' },
  { p: 'reports/morning/2026-05-19.md', t: '5h ago', who: 'reporter', op: 'created' },
  { p: 'specs/lava-escape/spec.md', t: '1d ago', who: 'you', op: 'created' },
]

const BRANCHES = [
  { n: 'main', cur: true, ahead: 0, behind: 0 },
  { n: 'feature/conveyor-curve', cur: false, ahead: 3, behind: 0, pr: '#47' },
  { n: 'feature/gamepass-2x-coins', cur: false, ahead: 12, behind: 1, pr: '#48' },
  { n: 'live/industrial-tycoon/neon-trail', cur: false, ahead: 0, behind: 0, merged: true },
  { n: 'live/industrial-tycoon/fix-conveyor', cur: false, ahead: 1, behind: 0, pr: '#46' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FolderIcon({ size = 14, color = 'var(--muted)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ color }}>
      <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6L7.5 4H13.5A1 1 0 0 1 14.5 5V12.5A1 1 0 0 1 13.5 13.5H2.5A1 1 0 0 1 1.5 12.5V3.5Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  )
}

function FileIcon({ size = 14, color = 'var(--muted)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ color }}>
      <path d="M3 2.5A1 1 0 0 1 4 1.5H9.5L13 5V13.5A1 1 0 0 1 12 14.5H4A1 1 0 0 1 3 13.5V2.5Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function SearchIcon({ size = 14, color = 'var(--muted)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ color }}>
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function RepoIcon({ size = 13, color = 'var(--muted)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ color }}>
      <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1 1.5 1.5 0 0 1 5 2.5V13.5A1.5 1.5 0 0 1 3.5 15 1.5 1.5 0 0 1 2 13.5V2.5Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M5 3H10.5A2 2 0 0 1 12.5 5V10A2 2 0 0 1 10.5 12H5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function KbdHint({ k, l }: { k: string; l: string }) {
  return (
    <span className="row gap-6">
      <span className="kbd">{k}</span>
      <span className="t-xs t-muted">{l}</span>
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RepoExplorer() {
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [q, setQ] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)

  const filtered = PALETTE_RESULTS.filter(r =>
    r.path.toLowerCase().includes(q.toLowerCase())
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      } else if (e.key === 'Escape') {
        setPaletteOpen(false)
      } else if (paletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setActiveIdx(i => Math.max(i - 1, 0))
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [paletteOpen, filtered.length])

  function openPalette() {
    setQ('')
    setActiveIdx(0)
    setPaletteOpen(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="topbar">
        <div className="crumbs" style={{ flex: 1, minWidth: 0 }}>
          <span className="crumb root">Snapblox</span>
          <span className="sep">/</span>
          <span className="crumb">Repository</span>
          <span className="sep">/</span>
          <span className="crumb last">map</span>
        </div>
        <button className="btn btn-sm" onClick={openPalette}>
          <SearchIcon size={13} color="currentColor" />
          Search files
          <span className="kbd" style={{ marginLeft: 4 }}>⌘K</span>
        </button>
      </div>

      <div className="page" style={{ overflowY: 'auto' }}>
        <div className="page-head">
          <div>
            <p className="text-cap" style={{ marginBottom: 6 }}>Repository</p>
            <h1>Repo map</h1>
            <p className="lead">Every folder in the agent stack. Locked nodes are agent-owned — read only.</p>
          </div>
          <div className="row gap-6">
            <button className="btn btn-sm btn-ghost">Tree</button>
            <button className="btn btn-sm btn-primary">Map</button>
            <button className="btn btn-sm btn-ghost">Graph</button>
            <div style={{ width: 12 }} />
            <button className="btn">
              <RepoIcon size={13} color="currentColor" />
              main ▾
            </button>
          </div>
        </div>

        <div className="card glow-violet fade-up d-1" style={{ padding: 22, position: 'relative' }}>
          <div className="row" style={{ marginBottom: 14 }}>
            <span className="text-cap">Roblox-agency · root</span>
            <div className="spacer" />
            <span className="t-mono t-xs t-muted">14 top-level entries · 426 files</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gridTemplateRows: 'repeat(6, 78px)',
            gap: 10,
          }}>
            {REPO_NODES.map(n => (
              <div
                key={n.id}
                className="card-hover"
                onClick={() => navigate(`/repo/${n.id}`)}
                style={{
                  gridColumn: `${n.x + 1} / span ${n.w}`,
                  gridRow: `${n.y + 1} / span ${n.h}`,
                  border: `1px solid ${n.accent ? 'var(--accent)' : n.locked ? 'var(--border)' : 'var(--border-2)'}`,
                  background: n.accent
                    ? 'linear-gradient(135deg, rgba(124,111,255,0.12), rgba(124,111,255,0.02))'
                    : 'var(--surface)',
                  borderRadius: 10,
                  padding: 12,
                  opacity: n.locked ? 0.55 : 1,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div className="row gap-6">
                  {n.kind === 'dir'
                    ? <FolderIcon size={14} color={n.accent ? 'var(--accent-soft)' : 'var(--muted)'} />
                    : <FileIcon size={14} color="var(--muted)" />
                  }
                  <span
                    className="t-mono"
                    style={{
                      fontSize: n.hero ? 14 : 12,
                      fontWeight: n.hero ? 600 : 500,
                      color: n.accent ? 'var(--ink)' : 'var(--ink-dim)',
                    }}
                  >
                    {n.label}
                  </span>
                  <div className="spacer" />
                  {n.locked && <span className="t-xs t-muted">🔒</span>}
                  {n.recent && <span className="dot dot-accent" style={{ width: 5, height: 5 }} />}
                </div>

                {n.count != null && (
                  <div className="t-mono t-xs t-muted" style={{ marginTop: 4 }}>
                    {n.count} {n.kind === 'dir' ? 'items' : ''}
                  </div>
                )}

                {n.hero && (
                  <div className="col gap-6" style={{ marginTop: 10, flex: 1, justifyContent: 'flex-end' }}>
                    {GAME_CHILDREN.map((g, i) => (
                      <div
                        key={i}
                        className="row gap-8"
                        style={{
                          background: 'rgba(10,10,15,0.4)',
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                        }}
                      >
                        <span
                          className={`dot dot-${g.status === 'building' ? 'live' : g.status === 'idle' ? 'muted' : 'accent'}`}
                          style={{ width: 6, height: 6 }}
                        />
                        <span
                          className="t-mono t-xs flex-1"
                          style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {g.label}
                        </span>
                        <span className="t-mono t-xs t-muted">{g.pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="row gap-16" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
            <KbdHint k="⌘K" l="Open palette" />
            <KbdHint k="1–9" l="Jump to top folder" />
            <KbdHint k="/" l="Inline search" />
            <KbdHint k="b" l="Branch switcher" />
            <KbdHint k="esc" l="Close" />
            <div className="spacer" />
            <span className="t-mono t-xs t-muted">last sync · 14s ago · main @ 7c4f2a1</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
          <section className="card fade-up d-2">
            <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14 }}>Recently changed</h3>
              <div className="spacer" />
              <span className="t-mono t-xs t-muted">across all branches</span>
            </div>
            <div>
              {RECENT_FILES.map((r, i) => (
                <div
                  key={i}
                  className="row gap-10"
                  style={{
                    padding: '9px 18px',
                    borderTop: i ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <FileIcon size={13} color="var(--muted)" />
                  <span
                    className="t-mono t-xs flex-1"
                    style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {r.p}
                  </span>
                  <span className="t-xs t-muted">{r.op} by {r.who}</span>
                  <span className="t-mono t-xs t-muted" style={{ minWidth: 60, textAlign: 'right' }}>{r.t}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card fade-up d-3">
            <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14 }}>Branches · 7</h3>
              <div className="spacer" />
              <button className="btn btn-sm btn-ghost">+ new</button>
            </div>
            <div>
              {BRANCHES.map((b, i) => (
                <div
                  key={i}
                  className="row gap-10"
                  style={{
                    padding: '10px 18px',
                    borderTop: i ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <RepoIcon size={13} color={b.cur ? 'var(--accent)' : 'var(--muted)'} />
                  <span
                    className="t-mono t-xs flex-1"
                    style={{
                      color: b.cur ? 'var(--ink)' : 'var(--ink-dim)',
                      fontWeight: b.cur ? 600 : 400,
                    }}
                  >
                    {b.n}
                  </span>
                  {b.cur && <span className="chip chip-accent">current</span>}
                  {b.pr && <span className="chip">{b.pr}</span>}
                  {b.merged && <span className="chip chip-success">merged</span>}
                  <span className="t-mono t-xs t-muted">
                    {b.ahead > 0 && `↑${b.ahead} `}{b.behind > 0 && `↓${b.behind}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {paletteOpen && (
        <div className="palette-backdrop" onClick={() => setPaletteOpen(false)}>
          <div className="palette" onClick={e => e.stopPropagation()}>
            <div className="palette-input">
              <SearchIcon size={18} color="var(--muted)" />
              <input
                autoFocus
                value={q}
                onChange={e => { setQ(e.target.value); setActiveIdx(0) }}
                placeholder="Search files, open paths, switch branches…"
              />
              <span className="kbd">esc</span>
            </div>
            <div className="palette-list">
              {filtered.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center' }} className="t-muted">No matches.</div>
              ) : filtered.map((r, i) => (
                <div
                  key={r.path}
                  className={`palette-item${i === activeIdx ? ' active' : ''}`}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  <FileIcon size={14} color="var(--muted)" />
                  <span className="path">{r.path}</span>
                  <span className="type">{r.type}</span>
                </div>
              ))}
            </div>
            <div
              className="row gap-16"
              style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-elev)' }}
            >
              <KbdHint k="↑↓" l="navigate" />
              <KbdHint k="↵" l="open" />
              <KbdHint k="⌘↵" l="open in new tab" />
              <div className="spacer" />
              <span className="t-mono t-xs t-muted">{filtered.length} of {PALETTE_RESULTS.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
