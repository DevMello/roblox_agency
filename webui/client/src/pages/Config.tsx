// Page 8 · /config — Config (health dashboard, MCP cards, sparklines)
import { useQuery } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MCPData {
  name: string
  addr: string
  ops: number
  cap: number
  peak: string
  usage: number[]
  status: 'live' | 'down'
  mode?: string
}

interface WorkerData {
  id: string
  role: string
  seen: string
  mcps: string[]
  ok: boolean
  current?: boolean
  stale?: boolean
}

interface CapProps {
  label: string
  value: string
  bar: number
  sub: string
}

// ─── Static fallback / display data ──────────────────────────────────────────

const STATIC_MCPS: MCPData[] = [
  { name: 'roblox-studio', addr: '%LOCALAPPDATA%\\Roblox\\mcp.bat', ops: 34, cap: 60, peak: 'building',       usage: [12,18,22,30,28,34,42,38,34,30,33,34], status: 'live' },
  { name: 'blender',       addr: 'localhost:3002',                  ops: 8,  cap: 30, peak: 'asset re-export', usage: [3,5,4,8,12,8,6,5,7,9,8,8],           status: 'live' },
  { name: 'chrome',        addr: 'localhost:3003',                  ops: 2,  cap: 5,  peak: 'tabs',             usage: [0,1,1,2,2,2,3,2,2,2,2,2],            status: 'live', mode: 'tabs' },
]

const STATIC_WORKERS: WorkerData[] = [
  { id: 'machine-a', role: 'coordinator', seen: '5 min ago',  mcps: ['roblox-studio', 'chrome'], ok: true,  current: true },
  { id: 'machine-b', role: 'worker',      seen: '32 min ago', mcps: ['blender'],                 ok: true  },
  { id: 'machine-c', role: 'worker',      seen: '4 days ago', mcps: [],                          ok: false, stale: true },
]

const COST_CAPS: CapProps[] = [
  { label: 'Per night cycle',    value: '$5.00',     bar: 84, sub: '$4.18 used yesterday'   },
  { label: 'Per week',           value: '$28.00',    bar: 56, sub: '$15.72 used this week'  },
  { label: 'Builder · per task', value: '8 000 tok', bar: 42, sub: 'avg 3.4k'              },
  { label: 'QA · per PR',        value: '4 000 tok', bar: 31, sub: 'avg 1.2k'              },
]

const SKILLS = [
  { name: 'luau-scripting',       agent: 'builder',   active: true,  size: '4.2 kb' },
  { name: 'blender-export',       agent: 'builder',   active: true,  size: '2.1 kb' },
  { name: 'milestone-planning',   agent: 'architect', active: true,  size: '6.0 kb' },
  { name: 'physics-tuning',       agent: 'builder',   active: false, size: '3.4 kb' },
  { name: 'monetisation-balance', agent: 'planner',   active: false, size: '1.9 kb' },
]

const ENV_KEYS = [
  { k: 'ANTHROPIC_API_KEY',     v: 'sk-ant-••••••••••••••••••••YYwM',           status: 'success' as const, label: 'valid · 2d left' },
  { k: 'GITHUB_TOKEN',          v: 'ghp_•••••••••••••••••••••••••••••a4',      status: 'success' as const, label: 'valid'           },
  { k: 'ROBLOX_OPEN_CLOUD_KEY', v: '(not set)',                                  status: 'danger'  as const, label: 'required'        },
  { k: 'SLACK_WEBHOOK_URL',     v: 'https://hooks.slack.com/services/T0••••••', status: 'success' as const, label: 'valid'           },
]

const AVAILABLE_MCPS = [
  { n: 'figma',    a: 'figma.com/mcp',     reason: 'pull design tokens & frames' },
  { n: 'slack',    a: 'api.slack.com/mcp', reason: 'post run reports to channel'  },
  { n: '+ custom', a: '',                  reason: 'paste an MCP endpoint URL'    },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

interface HeroStatProps {
  label: string
  value: string
  sub: string
  bar?: number
  barTone?: 'warning'
  valTone?: 'success'
}

function HeroStat({ label, value, sub, bar, barTone, valTone }: HeroStatProps) {
  return (
    <div className="col">
      <div className="text-cap">{label}</div>
      <div
        className="t-display"
        style={{
          fontSize: 30, lineHeight: 1, marginTop: 4, letterSpacing: '-0.02em',
          color: valTone === 'success' ? 'var(--success)' : 'var(--ink)',
        }}
      >
        {value}
      </div>
      <div className="t-xs t-muted" style={{ marginTop: 6 }}>{sub}</div>
      {bar != null && (
        <div className="bar" style={{ marginTop: 8, height: 4 }}>
          <div
            className="fill"
            style={{
              width: `${bar}%`,
              background: barTone === 'warning' ? 'var(--warning)' : undefined,
              boxShadow: barTone === 'warning' ? '0 0 8px rgba(255,181,71,0.4)' : undefined,
            }}
          />
        </div>
      )}
    </div>
  )
}

interface MCPCardProps {
  mcp: MCPData
  delay?: number
}

function MCPCard({ mcp, delay = 0 }: MCPCardProps) {
  const max = Math.max(...mcp.usage, 1)
  const sparkPoints = mcp.usage
    .map((v, i) => `${(i / (mcp.usage.length - 1)) * 120},${36 - (v / max) * 28 - 4}`)
    .join(' ')
  const fillPoints = `0,36 ${sparkPoints} 120,36`
  const delayClass = `d-${Math.min(delay + 1, 4)}`

  return (
    <div className={`card card-hover card-pad fade-up ${delayClass}`}>
      <div className="row gap-10">
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'rgba(0, 229, 160, 0.10)',
          border: '1px solid rgba(0, 229, 160, 0.3)',
          display: 'grid', placeItems: 'center',
        }}>
          <span className="dot dot-live" />
        </div>
        <div className="col flex-1">
          <div className="t-display" style={{ fontSize: 15 }}>{mcp.name}</div>
          <div className="t-mono t-xs t-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mcp.addr}</div>
        </div>
        <span className="chip chip-success">connected</span>
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <div className="col">
          <span className="text-cap">{mcp.mode === 'tabs' ? 'Tabs' : 'Ops / min'}</span>
          <span className="t-display" style={{ fontSize: 22, marginTop: 2 }}>
            {mcp.ops} <span className="t-muted t-sm">/ {mcp.cap}</span>
          </span>
        </div>
        <div className="spacer" />
        <svg width="120" height="36" viewBox="0 0 120 36" style={{ marginTop: 4 }}>
          <defs>
            <linearGradient id={`sparkfill-${mcp.name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            points={sparkPoints}
            style={{ filter: 'drop-shadow(0 0 4px var(--accent-glow))' }}
          />
          <polyline
            fill={`url(#sparkfill-${mcp.name})`}
            stroke="none"
            points={fillPoints}
            opacity="0.25"
          />
        </svg>
      </div>

      <div className="row" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <span className="t-xs t-muted">peak · {mcp.peak}</span>
        <div className="spacer" />
        <button className="btn btn-sm btn-ghost">Test</button>
        <button className="btn btn-sm btn-ghost">Edit</button>
      </div>
    </div>
  )
}

function Cap({ label, value, bar, sub }: CapProps) {
  return (
    <div className="col gap-4">
      <div className="row">
        <span className="t-sm">{label}</span>
        <div className="spacer" />
        <span className="t-mono t-sm t-dim">{value}</span>
      </div>
      <div className="bar" style={{ height: 5 }}>
        <div className="fill" style={{ width: `${bar}%` }} />
      </div>
      <span className="t-xs t-muted">{sub}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Config() {
  const mcpQuery = useQuery<MCPData[]>({
    queryKey: ['config', 'mcp'],
    queryFn: async () => {
      const res = await fetch('/api/v1/config/mcp')
      if (!res.ok) throw new Error('mcp-404')
      return res.json() as Promise<MCPData[]>
    },
    retry: false,
  })

  const mcps: MCPData[] = (mcpQuery.data && mcpQuery.data.length > 0) ? mcpQuery.data : STATIC_MCPS
  const workers: WorkerData[] = STATIC_WORKERS

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="text-cap" style={{ marginBottom: 6 }}>System</div>
          <h1>Health</h1>
          <div className="lead">MCPs, skills, keys, workers — the whole control plane in one panel.</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-sm btn-ghost">Run diagnostics</button>
          <button className="btn btn-sm">View .mcp.json</button>
          <button className="btn btn-sm btn-primary">+ Add</button>
        </div>
      </div>

      {/* HERO HEALTH */}
      <section className="card glow-violet fade-up d-0" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 28, alignItems: 'center' }}>
          <div>
            <div className="row gap-8" style={{ marginBottom: 8 }}>
              <span className="dot dot-live" />
              <span className="text-cap" style={{ marginBottom: 0, color: 'var(--success)' }}>all systems clear</span>
            </div>
            <h2 style={{ fontSize: 38, lineHeight: 1, letterSpacing: '-0.025em' }}>
              {mcps.length} / 3 <span style={{ color: 'var(--muted)' }}>MCPs</span>
            </h2>
            <div className="t-sm t-muted" style={{ marginTop: 8, maxWidth: 360 }}>
              roblox-studio · blender · chrome — all responding. No keys expired. Cost & tokens within cap.
            </div>
          </div>
          <HeroStat label="Spend · 7d"   value="$4.18" sub="cap $5.00"    bar={84} barTone="warning" />
          <HeroStat label="Tokens · 24h" value="124 k" sub="of 200 k cap" bar={62} />
          <HeroStat label="Builds · 7d"  value="22"    sub="98% success"  valTone="success" />
        </div>
      </section>

      {/* MCP servers */}
      <div className="row" style={{ marginBottom: 14 }}>
        <h3 className="text-cap" style={{ fontSize: 11 }}>MCP servers · {mcps.length}</h3>
        <div className="spacer" />
        <span className="t-mono t-xs t-muted">.mcp.json · {mcps.length} active · 2 available</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {mcps.map((s, i) => <MCPCard key={s.name} mcp={s} delay={i} />)}
      </div>

      {/* Available MCPs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {AVAILABLE_MCPS.map(s => (
          <div key={s.n} className="card card-pad fade-up d-3" style={{ borderStyle: 'dashed', opacity: 0.85 }}>
            <div className="row gap-8">
              <span className="dot dot-open" />
              <span className="t-display" style={{ fontSize: 14 }}>{s.n}</span>
              <div className="spacer" />
              <span className="t-mono t-xs t-muted">available</span>
            </div>
            {s.a && <div className="t-mono t-xs t-muted" style={{ marginTop: 6 }}>{s.a}</div>}
            <div className="t-xs t-muted" style={{ marginTop: 8, marginBottom: 14 }}>{s.reason}</div>
            <button className="btn btn-sm btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Enable</button>
          </div>
        ))}
      </div>

      {/* Skills + Workers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        <section className="card fade-up d-1">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Agent skills</h3>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost">+ Add skill</button>
          </div>
          <div>
            {SKILLS.map((s, i) => (
              <div key={s.name} className="row gap-12" style={{ padding: '11px 20px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 3,
                  border: `1px solid ${s.active ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: s.active ? 'var(--accent)' : 'transparent',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  {s.active && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <polyline points="2,5 4,7 8,3" stroke="#0A0A0F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="t-sm flex-1" style={{ color: s.active ? 'var(--ink)' : 'var(--muted)' }}>{s.name}</span>
                <span className="chip">{s.agent}</span>
                <span className="t-mono t-xs t-muted">{s.size}</span>
                <button className="btn btn-sm btn-ghost">{s.active ? 'View' : 'Activate'}</button>
              </div>
            ))}
          </div>
        </section>

        <section className="card fade-up d-2">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Workers</h3>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost">+ Register</button>
          </div>
          <div>
            {workers.map((w, i) => (
              <div
                key={w.id}
                className="row gap-12"
                style={{ padding: '14px 20px', borderTop: i ? '1px solid var(--border)' : 'none', opacity: w.stale ? 0.65 : 1 }}
              >
                <span className={`dot dot-${w.stale ? 'danger' : 'success'}`} style={{ marginTop: 3 }} />
                <div className="col flex-1">
                  <div className="row gap-8">
                    <span className="t-mono t-sm">{w.id}</span>
                    <span className="chip">{w.role}</span>
                    {w.current && <span className="chip chip-accent">this machine</span>}
                  </div>
                  <div className="row gap-6" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                    {w.mcps.map(m => <span key={m} className="chip t-mono">{m}</span>)}
                    {w.mcps.length === 0 && <span className="t-xs t-muted">no MCPs</span>}
                  </div>
                </div>
                <div className="col" style={{ alignItems: 'flex-end' }}>
                  <span className="t-mono t-xs" style={{ color: w.stale ? 'var(--danger)' : 'var(--muted)' }}>{w.seen}</span>
                  {w.stale && <button className="btn btn-sm btn-ghost btn-danger" style={{ marginTop: 4 }}>Unregister</button>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Env & Cost caps */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 32 }}>
        <section className="card fade-up d-3">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Environment & API keys</h3>
            <div className="spacer" />
            <span className="t-mono t-xs t-muted">.env</span>
          </div>
          <div>
            {ENV_KEYS.map((e, i) => (
              <div key={e.k} className="row gap-12" style={{ padding: '12px 20px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span
                  className="t-mono t-sm"
                  style={{ width: 200, color: e.status === 'danger' ? 'var(--danger)' : 'var(--ink-dim)' }}
                >
                  {e.k}
                </span>
                <span
                  className="t-mono t-xs t-muted flex-1"
                  style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {e.v}
                </span>
                <span className={`chip chip-${e.status}`}>{e.label}</span>
                <button className="btn btn-sm btn-ghost">{e.status === 'danger' ? '+ Add' : 'Test'}</button>
                <button className="btn btn-sm btn-ghost">Edit</button>
              </div>
            ))}
          </div>
        </section>

        <section className="card fade-up d-4">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Cost & token caps</h3>
          </div>
          <div className="col gap-14" style={{ padding: '16px 20px' }}>
            {COST_CAPS.map(c => <Cap key={c.label} label={c.label} value={c.value} bar={c.bar} sub={c.sub} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
