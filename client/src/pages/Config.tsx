// Page 8 · /config — Health dashboard (MCP cards, skills, workers, usage)
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchJson, API } from '../utils/api'
import { useRunList } from '../hooks/useRun'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MCPEntry {
  name: string
  type?: string
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  // display-only (from health check)
  status?: 'up' | 'down' | 'unknown'
  detail?: string
}

interface Skill {
  name: string
  agent: string
  active: boolean
  description: string
}

interface Worker {
  id: string
  slug: string
  machine_name?: string
  status: string
  last_seen_at?: string
  registered_at?: string
}

interface EnvKey {
  key: string
  has_value: boolean
}

interface UISettings {
  calculate_usage: boolean
}

interface DailyEntry {
  period: string
  totalCost: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  modelsUsed?: string[]
}

interface UsageData {
  error?: string
  detail?: string
  raw?: string
  // structured fields returned by /api/v1/config/usage
  spend_7d?: number
  tokens_24h?: number
  input_24h?: number
  output_24h?: number
  cache_creation_24h?: number
  cache_read_24h?: number
  daily?: DailyEntry[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso?: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} hr ago`
  return `${Math.floor(ms / 86_400_000)} days ago`
}

function isStale(iso?: string | null): boolean {
  if (!iso) return true
  return Date.now() - new Date(iso).getTime() > 3_600_000
}

function fmtCost(v: number | undefined): string {
  if (v == null) return '—'
  return `$${v.toFixed(2)}`
}

function fmtTokens(v: number | undefined): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} k`
  return String(v)
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card" style={{ width: 480, maxHeight: '85vh', overflow: 'auto', padding: 0 }}>
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14 }}>{title}</h3>
          <div className="spacer" />
          <button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>{children}</div>
      </div>
    </div>
  )
}

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
      <div className="t-display" style={{ fontSize: 30, lineHeight: 1, marginTop: 4, letterSpacing: '-0.02em', color: valTone === 'success' ? 'var(--success)' : 'var(--ink)' }}>
        {value}
      </div>
      <div className="t-xs t-muted" style={{ marginTop: 6 }}>{sub}</div>
      {bar != null && (
        <div className="bar" style={{ marginTop: 8, height: 4 }}>
          <div className="fill" style={{ width: `${bar}%`, background: barTone === 'warning' ? 'var(--warning)' : undefined, boxShadow: barTone === 'warning' ? '0 0 8px rgba(255,181,71,0.4)' : undefined }} />
        </div>
      )}
    </div>
  )
}

function MCPCard({
  mcp,
  delay = 0,
  onEdit,
}: {
  mcp: MCPEntry
  delay?: number
  onEdit: (m: MCPEntry) => void
}) {
  const [testResult, setTestResult] = useState<{ status: string; detail: string } | null>(null)
  const [testing, setTesting] = useState(false)

  async function handleTest() {
    setTesting(true)
    try {
      const results = await fetchJson<{ name: string; status: string; detail: string }[]>(`${API}/config/mcp/health`)
      const mine = results.find(r => r.name === mcp.name)
      setTestResult(mine ?? { status: 'unknown', detail: 'Not found in health check' })
    } catch {
      setTestResult({ status: 'unknown', detail: 'Health check failed' })
    } finally {
      setTesting(false)
    }
  }

  const addr = mcp.url ?? (mcp.command ? `${mcp.command} ${(mcp.args ?? []).join(' ')}` : '—')
  const delayClass = `d-${Math.min(delay + 1, 4)}`

  return (
    <div className={`card card-hover card-pad fade-up ${delayClass}`}>
      <div className="row gap-10">
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(0,229,160,0.10)', border: '1px solid rgba(0,229,160,0.3)', display: 'grid', placeItems: 'center' }}>
          <span className="dot dot-live" />
        </div>
        <div className="col flex-1" style={{ minWidth: 0 }}>
          <div className="t-display" style={{ fontSize: 15 }}>{mcp.name}</div>
          <div className="t-mono t-xs t-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addr}</div>
        </div>
        {testResult ? (
          <span className={`chip chip-${testResult.status === 'up' ? 'success' : testResult.status === 'down' ? 'danger' : ''}`} title={testResult.detail}>
            {testResult.status}
          </span>
        ) : (
          <span className="chip chip-success">connected</span>
        )}
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <div className="col">
          <span className="text-cap">Type</span>
          <span className="t-display" style={{ fontSize: 15, marginTop: 2 }}>{mcp.type ?? 'stdio'}</span>
        </div>
      </div>
      <div className="row" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <span className="t-xs t-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
          {mcp.args?.join(' ') ?? ''}
        </span>
        <div className="spacer" />
        <button className="btn btn-sm btn-ghost" onClick={handleTest} disabled={testing}>{testing ? '…' : 'Test'}</button>
        <button className="btn btn-sm btn-ghost" onClick={() => onEdit(mcp)}>Edit</button>
      </div>
    </div>
  )
}

// ─── MCP Form (shared by Add + Edit) ─────────────────────────────────────────

function MCPForm({
  initial,
  onSubmit,
  onDelete,
  pending,
}: {
  initial?: Partial<MCPEntry>
  onSubmit: (data: MCPEntry) => void
  onDelete?: () => void
  pending: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? 'stdio')
  const [command, setCommand] = useState(initial?.command ?? '')
  const [argsStr, setArgsStr] = useState((initial?.args ?? []).join(' '))
  const [url, setUrl] = useState(initial?.url ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const entry: MCPEntry = { name: name.trim(), type }
    if (type === 'stdio') {
      entry.command = command.trim()
      if (argsStr.trim()) entry.args = argsStr.trim().split(/\s+/)
    } else {
      entry.url = url.trim()
    }
    onSubmit(entry)
  }

  return (
    <form className="col gap-12" onSubmit={handleSubmit}>
      <div>
        <label className="label-cap">Name</label>
        <input className="field" value={name} onChange={e => setName(e.target.value)} required disabled={!!initial?.name} />
      </div>
      <div>
        <label className="label-cap">Type</label>
        <select className="field" value={type} onChange={e => setType(e.target.value)}>
          <option value="stdio">stdio</option>
          <option value="http">http</option>
          <option value="sse">sse</option>
        </select>
      </div>
      {type === 'stdio' ? (
        <>
          <div>
            <label className="label-cap">Command</label>
            <input className="field field-mono" value={command} onChange={e => setCommand(e.target.value)} placeholder="npx or path to .bat" required />
          </div>
          <div>
            <label className="label-cap">Args (space-separated)</label>
            <input className="field field-mono" value={argsStr} onChange={e => setArgsStr(e.target.value)} placeholder="chrome-devtools-mcp@latest" />
          </div>
        </>
      ) : (
        <div>
          <label className="label-cap">URL</label>
          <input className="field field-mono" value={url} onChange={e => setUrl(e.target.value)} placeholder="http://localhost:3002" required />
        </div>
      )}
      <div className="row gap-8" style={{ marginTop: 4 }}>
        {onDelete && (
          <button type="button" className="btn btn-ghost btn-danger" onClick={onDelete} style={{ marginRight: 'auto' }}>Remove</button>
        )}
        <button type="submit" className="btn btn-primary flex-1" style={{ justifyContent: 'center' }} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Config() {
  const qc = useQueryClient()

  // ── Queries ────────────────────────────────────────────────────────────────

  const mcpQuery = useQuery<MCPEntry[]>({
    queryKey: ['config', 'mcp'],
    queryFn: () => fetchJson<MCPEntry[]>(`${API}/config/mcp`),
    retry: false,
  })

  const mcpRawQuery = useQuery<{ content: string }>({
    queryKey: ['config', 'mcp', 'raw'],
    queryFn: () => fetchJson<{ content: string }>(`${API}/config/mcp/raw`),
    enabled: false,
  })

  const skillsQuery = useQuery<Skill[]>({
    queryKey: ['config', 'skills'],
    queryFn: () => fetchJson<Skill[]>(`${API}/config/skills`),
  })

  const workersQuery = useQuery<{ workers: Worker[]; source: string }>({
    queryKey: ['config', 'workers'],
    queryFn: () => fetchJson<{ workers: Worker[]; source: string }>(`${API}/config/workers`),
    refetchInterval: 30_000,
  })

  const envQuery = useQuery<EnvKey[]>({
    queryKey: ['config', 'env'],
    queryFn: () => fetchJson<EnvKey[]>(`${API}/config/env`),
  })

  const settingsQuery = useQuery<UISettings>({
    queryKey: ['config', 'settings'],
    queryFn: () => fetchJson<UISettings>(`${API}/config/settings`),
  })

  const usageQuery = useQuery<UsageData>({
    queryKey: ['config', 'usage'],
    queryFn: () => fetchJson<UsageData>(`${API}/config/usage`),
    enabled: settingsQuery.data?.calculate_usage === true,
    staleTime: 5 * 60_000,
  })

  const runsQuery = useRunList()

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addMcp = useMutation({
    mutationFn: (body: MCPEntry) => fetchJson<void>(`${API}/config/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['config', 'mcp'] }),
  })

  const deleteMcp = useMutation({
    mutationFn: (name: string) => fetchJson<void>(`${API}/config/mcp/${encodeURIComponent(name)}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['config', 'mcp'] }),
  })

  const addSkill = useMutation({
    mutationFn: (body: Partial<Skill>) => fetchJson<void>(`${API}/config/skills`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['config', 'skills'] }); setAddSkillModal(false) },
  })

  const toggleSkill = useMutation({
    mutationFn: ({ name, active }: { name: string; active: boolean }) =>
      fetchJson<void>(`${API}/config/skills/${encodeURIComponent(name)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['config', 'skills'] }),
  })

  const registerWorker = useMutation({
    mutationFn: (body: { slug: string; machine_name: string }) =>
      fetchJson<void>(`${API}/workers/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['config', 'workers'] }); setRegisterModal(false) },
  })

  const unregisterWorker = useMutation({
    mutationFn: (id: string) => fetchJson<void>(`${API}/workers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['config', 'workers'] }),
  })

  const updateSettings = useMutation({
    mutationFn: (body: Partial<UISettings>) =>
      fetchJson<UISettings>(`${API}/config/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['config', 'settings'] }),
  })

  // ── Modal state ────────────────────────────────────────────────────────────

  const [mcpJsonModal, setMcpJsonModal] = useState(false)
  const [addMcpModal, setAddMcpModal] = useState(false)
  const [addMcpPrefill, setAddMcpPrefill] = useState<Partial<MCPEntry> | undefined>()
  const [editMcp, setEditMcp] = useState<MCPEntry | null>(null)
  const [addSkillModal, setAddSkillModal] = useState(false)
  const [registerModal, setRegisterModal] = useState(false)

  // Skill form state
  const [skillName, setSkillName] = useState('')
  const [skillAgent, setSkillAgent] = useState('builder')
  const [skillDesc, setSkillDesc] = useState('')

  // Worker form state
  const [workerSlug, setWorkerSlug] = useState('')
  const [workerMachine, setWorkerMachine] = useState('')

  // Fetch raw JSON when modal opens
  useEffect(() => {
    if (mcpJsonModal) void mcpRawQuery.refetch()
  }, [mcpJsonModal]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ───────────────────────────────────────────────────────────

  const mcps: MCPEntry[] = mcpQuery.data ?? []
  const skills: Skill[] = skillsQuery.data ?? []
  const workers: Worker[] = workersQuery.data?.workers ?? []
  const envKeys: EnvKey[] = envQuery.data ?? []
  const settings: UISettings = settingsQuery.data ?? { calculate_usage: false }
  const usage: UsageData | undefined = usageQuery.data

  const calcUsage = settings.calculate_usage
  const spendVal = calcUsage ? fmtCost(usage?.spend_7d) : '—'
  const tokensVal = calcUsage ? fmtTokens(usage?.tokens_24h) : '—'

  const buildsVal = useMemo(() => {
    if (!runsQuery.data) return '—'
    const cutoff = Date.now() - 7 * 86_400_000
    return String(runsQuery.data.filter(r =>
      r.status === 'completed' && r.ended_at && new Date(r.ended_at).getTime() > cutoff
    ).length)
  }, [runsQuery.data])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <div className="text-cap" style={{ marginBottom: 6 }}>System</div>
          <h1>Health</h1>
          <div className="lead">MCPs, skills, keys, workers — the whole control plane in one panel.</div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-sm btn-ghost" onClick={() => void qc.invalidateQueries()}>Run diagnostics</button>
          <button className="btn btn-sm" onClick={() => setMcpJsonModal(true)}>View .mcp.json</button>
          <button className="btn btn-sm btn-primary" onClick={() => { setAddMcpPrefill(undefined); setAddMcpModal(true) }}>+ Add</button>
        </div>
      </div>

      {/* ── Hero health ─────────────────────────────────────────────────── */}
      <section className="card glow-violet fade-up d-0" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 28, alignItems: 'center' }}>
          <div>
            <div className="row gap-8" style={{ marginBottom: 8 }}>
              <span className="dot dot-live" />
              <span className="text-cap" style={{ marginBottom: 0, color: 'var(--success)' }}>
                {mcpQuery.isLoading ? 'loading…' : 'systems checked'}
              </span>
            </div>
            <h2 style={{ fontSize: 38, lineHeight: 1, letterSpacing: '-0.025em' }}>
              {mcps.length} <span style={{ color: 'var(--muted)' }}>MCPs</span>
            </h2>
            <div className="t-sm t-muted" style={{ marginTop: 8, maxWidth: 360 }}>
              {mcps.length === 0 ? 'No MCP servers configured yet.' : mcps.map(m => m.name).join(' · ')}
            </div>
          </div>
          <HeroStat
            label="Spend · 7d"
            value={spendVal}
            sub={calcUsage && usage?.error ? 'ccusage error' : calcUsage ? 'from ccusage' : 'enable usage tracking →'}
            bar={undefined}
          />
          <HeroStat
            label="Tokens · 24h"
            value={tokensVal}
            sub={calcUsage ? 'from ccusage' : '—'}
          />
          <HeroStat
            label="Builds · 7d"
            value={buildsVal}
            sub="from run history"
            valTone="success"
          />
        </div>
      </section>

      {/* ── MCP servers ─────────────────────────────────────────────────── */}
      <div className="row" style={{ marginBottom: 14 }}>
        <h3 className="text-cap" style={{ fontSize: 11 }}>MCP servers · {mcps.length}</h3>
        <div className="spacer" />
        <span className="t-mono t-xs t-muted">.mcp.json · {mcps.length} configured</span>
      </div>

      {mcpQuery.isLoading ? (
        <div className="t-sm t-muted" style={{ marginBottom: 32 }}>Loading…</div>
      ) : mcps.length === 0 ? (
        <div className="t-sm t-muted" style={{ marginBottom: 32 }}>No MCP servers in .mcp.json yet. Click "+ Add" to configure one.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {mcps.map((m, i) => (
            <MCPCard key={m.name} mcp={m} delay={i} onEdit={setEditMcp} />
          ))}
        </div>
      )}

      {/* ── Skills + Workers ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>

        {/* Skills */}
        <section className="card fade-up d-1">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Agent skills</h3>
            <div className="spacer" />
            <button className="btn btn-sm btn-ghost" onClick={() => setAddSkillModal(true)}>+ Add skill</button>
          </div>
          <div>
            {skillsQuery.isLoading && <div style={{ padding: '12px 20px' }} className="t-sm t-muted">Loading…</div>}
            {skills.map((s, i) => (
              <div key={s.name} className="row gap-12" style={{ padding: '11px 20px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <button
                  style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${s.active ? 'var(--accent)' : 'var(--border-strong)'}`, background: s.active ? 'var(--accent)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => toggleSkill.mutate({ name: s.name, active: !s.active })}
                  title={s.active ? 'Deactivate' : 'Activate'}
                >
                  {s.active && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <polyline points="2,5 4,7 8,3" stroke="#0A0A0F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className="t-sm flex-1" style={{ color: s.active ? 'var(--ink)' : 'var(--muted)' }} title={s.description}>{s.name}</span>
                <span className="chip">{s.agent}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => toggleSkill.mutate({ name: s.name, active: !s.active })}>
                  {s.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Workers */}
        <section className="card fade-up d-2">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Workers</h3>
            <div className="spacer" />
            <span className="t-mono t-xs t-muted" style={{ marginRight: 8 }}>
              {workersQuery.data?.source === 'db' ? 'db' : 'fallback'}
            </span>
            <button className="btn btn-sm btn-ghost" onClick={() => setRegisterModal(true)}>+ Register</button>
          </div>
          <div>
            {workersQuery.isLoading && <div style={{ padding: '12px 20px' }} className="t-sm t-muted">Loading…</div>}
            {workers.length === 0 && !workersQuery.isLoading && (
              <div style={{ padding: '12px 20px' }} className="t-sm t-muted">No workers registered yet.</div>
            )}
            {workers.map((w, i) => {
              const stale = isStale(w.last_seen_at)
              return (
                <div key={w.id} className="row gap-12" style={{ padding: '14px 20px', borderTop: i ? '1px solid var(--border)' : 'none', opacity: stale ? 0.65 : 1 }}>
                  <span className={`dot dot-${stale ? 'danger' : 'success'}`} style={{ marginTop: 3 }} />
                  <div className="col flex-1">
                    <div className="row gap-8">
                      <span className="t-mono t-sm">{w.slug}</span>
                      <span className="chip">{w.status}</span>
                    </div>
                    {w.machine_name && <div className="t-xs t-muted" style={{ marginTop: 2 }}>{w.machine_name}</div>}
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end' }}>
                    <span className="t-mono t-xs" style={{ color: stale ? 'var(--danger)' : 'var(--muted)' }}>
                      {relativeTime(w.last_seen_at)}
                    </span>
                    {stale && (
                      <button
                        className="btn btn-sm btn-ghost btn-danger"
                        style={{ marginTop: 4 }}
                        onClick={() => unregisterWorker.mutate(w.id)}
                        disabled={unregisterWorker.isPending}
                      >
                        Unregister
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ── Env & Cost/Usage ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 32 }}>

        {/* ENV keys */}
        <section className="card fade-up d-3">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Environment & API keys</h3>
            <div className="spacer" />
            <span className="t-mono t-xs t-muted">.env.example</span>
          </div>
          <div>
            {envQuery.isLoading && <div style={{ padding: '12px 20px' }} className="t-sm t-muted">Loading…</div>}
            {envKeys.length === 0 && !envQuery.isLoading && (
              <div style={{ padding: '12px 20px' }} className="t-sm t-muted">No .env.example found.</div>
            )}
            {envKeys.map((e, i) => (
              <div key={e.key} className="row gap-12" style={{ padding: '12px 20px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span className="t-mono t-sm" style={{ width: 200, color: e.has_value ? 'var(--ink-dim)' : 'var(--danger)', flexShrink: 0 }}>
                  {e.key}
                </span>
                <span className="t-mono t-xs t-muted flex-1">
                  {e.has_value ? '••••••••••••' : '(not set)'}
                </span>
                <span className={`chip chip-${e.has_value ? 'success' : 'danger'}`}>
                  {e.has_value ? 'set' : 'missing'}
                </span>
                <button className="btn btn-sm btn-ghost" onClick={() => void envQuery.refetch()}>
                  {e.has_value ? 'Test' : '+ Add'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Usage & Settings */}
        <section className="card fade-up d-4">
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14 }}>Usage analytics</h3>
          </div>
          <div className="col gap-16" style={{ padding: '16px 20px' }}>

            {/* Calculate usage toggle */}
            <div className="row gap-12" style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div className="col flex-1">
                <span className="t-sm" style={{ fontWeight: 500 }}>Calculate usage</span>
                <span className="t-xs t-muted" style={{ marginTop: 2 }}>
                  Runs <span className="t-mono">ccusage@latest</span> to pull real spend & token data
                </span>
              </div>
              <button
                onClick={() => updateSettings.mutate({ calculate_usage: !calcUsage })}
                disabled={updateSettings.isPending || settingsQuery.isLoading}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                  background: calcUsage ? 'var(--accent)' : 'var(--border-strong)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: calcUsage ? 21 : 3, width: 16, height: 16,
                  borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* Usage results */}
            {calcUsage && (
              <>
                {usageQuery.isLoading && <div className="t-sm t-muted">Running ccusage…</div>}
                {usage?.error && (
                  <div style={{ padding: 10, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 6 }}>
                    <div className="t-sm" style={{ color: 'var(--danger)' }}>{usage.error}</div>
                    {usage.detail && <div className="t-xs t-muted" style={{ marginTop: 4, fontFamily: 'var(--f-mono)' }}>{usage.detail}</div>}
                    <div className="t-xs t-muted" style={{ marginTop: 6 }}>
                      Install with: <span className="t-mono">npm install -g ccusage</span>
                    </div>
                  </div>
                )}
                {usage && !usage.error && (
                  <div className="col gap-10">
                    <div className="row">
                      <span className="t-sm" style={{ fontWeight: 500 }}>Spend · 7 days</span>
                      <div className="spacer" />
                      <span className="t-mono t-sm" style={{ color: 'var(--warning)' }}>{fmtCost(usage.spend_7d)}</span>
                    </div>
                    <div className="row">
                      <span className="t-sm" style={{ fontWeight: 500 }}>Tokens · today</span>
                      <div className="spacer" />
                      <span className="t-mono t-sm">{fmtTokens(usage.tokens_24h)}</span>
                    </div>
                    {(usage.input_24h ?? 0) > 0 && (
                      <div style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }} className="col gap-6">
                        <div className="row">
                          <span className="t-xs t-muted">Input</span>
                          <div className="spacer" />
                          <span className="t-mono t-xs t-dim">{fmtTokens(usage.input_24h)}</span>
                        </div>
                        <div className="row">
                          <span className="t-xs t-muted">Output</span>
                          <div className="spacer" />
                          <span className="t-mono t-xs t-dim">{fmtTokens(usage.output_24h)}</span>
                        </div>
                        <div className="row">
                          <span className="t-xs t-muted">Cache write</span>
                          <div className="spacer" />
                          <span className="t-mono t-xs t-dim">{fmtTokens(usage.cache_creation_24h)}</span>
                        </div>
                        <div className="row">
                          <span className="t-xs t-muted">Cache read</span>
                          <div className="spacer" />
                          <span className="t-mono t-xs t-dim">{fmtTokens(usage.cache_read_24h)}</span>
                        </div>
                      </div>
                    )}
                    {usage.daily && usage.daily.length > 0 && (
                      <div className="col gap-2" style={{ marginTop: 2 }}>
                        <span className="text-cap" style={{ fontSize: 9 }}>Last 7 days spend</span>
                        <div className="row gap-4" style={{ alignItems: 'flex-end', height: 28 }}>
                          {usage.daily.slice(-7).map((d, i) => {
                            const maxCost = Math.max(...(usage.daily ?? []).slice(-7).map(e => e.totalCost ?? 0), 0.01)
                            const h = Math.max(2, Math.round(((d.totalCost ?? 0) / maxCost) * 24))
                            return (
                              <div key={i} title={`${d.period}: ${fmtCost(d.totalCost)}`} style={{ flex: 1, height: h, background: 'var(--accent)', borderRadius: 2, opacity: 0.7 }} />
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <button className="btn btn-sm btn-ghost" style={{ justifyContent: 'center' }} onClick={() => void usageQuery.refetch()}>
                      Refresh
                    </button>
                  </div>
                )}
              </>
            )}

            {!calcUsage && (
              <div className="t-xs t-muted">Enable "Calculate usage" above to see real spend and token data from your Claude Code sessions.</div>
            )}
          </div>
        </section>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      {/* View .mcp.json */}
      {mcpJsonModal && (
        <Modal title=".mcp.json" onClose={() => setMcpJsonModal(false)}>
          {mcpRawQuery.isLoading && <div className="t-sm t-muted">Loading…</div>}
          {mcpRawQuery.isError && <div className="t-sm" style={{ color: 'var(--danger)' }}>Failed to load .mcp.json</div>}
          {mcpRawQuery.data && (
            <pre style={{ margin: 0, fontSize: 12, fontFamily: 'var(--f-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--ink-dim)', maxHeight: 400, overflow: 'auto' }}>
              {mcpRawQuery.data.content}
            </pre>
          )}
        </Modal>
      )}

      {/* Add MCP */}
      {addMcpModal && (
        <Modal title="Add MCP server" onClose={() => setAddMcpModal(false)}>
          <MCPForm
            initial={addMcpPrefill}
            pending={addMcp.isPending}
            onSubmit={entry => {
              addMcp.mutate(entry, { onSuccess: () => setAddMcpModal(false) })
            }}
          />
        </Modal>
      )}

      {/* Edit MCP */}
      {editMcp && (
        <Modal title={`Edit · ${editMcp.name}`} onClose={() => setEditMcp(null)}>
          <MCPForm
            initial={editMcp}
            pending={addMcp.isPending || deleteMcp.isPending}
            onSubmit={entry => {
              addMcp.mutate(entry, { onSuccess: () => setEditMcp(null) })
            }}
            onDelete={() => {
              deleteMcp.mutate(editMcp.name, { onSuccess: () => setEditMcp(null) })
            }}
          />
        </Modal>
      )}

      {/* Add skill */}
      {addSkillModal && (
        <Modal title="Add skill" onClose={() => setAddSkillModal(false)}>
          <form className="col gap-12" onSubmit={e => {
            e.preventDefault()
            addSkill.mutate({ name: skillName.trim(), agent: skillAgent, description: skillDesc, active: true })
          }}>
            <div>
              <label className="label-cap">Name</label>
              <input className="field" value={skillName} onChange={e => setSkillName(e.target.value)} required placeholder="e.g. combat-tuning" />
            </div>
            <div>
              <label className="label-cap">Agent</label>
              <select className="field" value={skillAgent} onChange={e => setSkillAgent(e.target.value)}>
                {['builder', 'architect', 'planner', 'qa', 'reporter', 'researcher', 'market-researcher'].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-cap">Description</label>
              <input className="field" value={skillDesc} onChange={e => setSkillDesc(e.target.value)} placeholder="Optional short description" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={addSkill.isPending}>
              {addSkill.isPending ? 'Saving…' : 'Add skill'}
            </button>
          </form>
        </Modal>
      )}

      {/* Register worker */}
      {registerModal && (
        <Modal title="Register worker" onClose={() => setRegisterModal(false)}>
          <form className="col gap-12" onSubmit={e => {
            e.preventDefault()
            registerWorker.mutate({ slug: workerSlug.trim(), machine_name: workerMachine.trim() })
          }}>
            <div>
              <label className="label-cap">Slug (unique ID)</label>
              <input className="field field-mono" value={workerSlug} onChange={e => setWorkerSlug(e.target.value)} required placeholder="e.g. machine-a" />
            </div>
            <div>
              <label className="label-cap">Machine name (optional)</label>
              <input className="field" value={workerMachine} onChange={e => setWorkerMachine(e.target.value)} placeholder="e.g. Mac Studio M4" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={registerWorker.isPending}>
              {registerWorker.isPending ? 'Registering…' : 'Register'}
            </button>
          </form>
        </Modal>
      )}

    </div>
  )
}
