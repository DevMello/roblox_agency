import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MCPServer {
  name: string
  type: string
  command: string
  args?: string[]
}

interface MCPHealth {
  [name: string]: 'up' | 'down' | 'unknown'
}

interface EnvEntry {
  key: string
  has_value: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function HealthDot({ status }: { status: 'up' | 'down' | 'unknown' | undefined }) {
  const colors: Record<string, string> = {
    up: 'bg-success',
    down: 'bg-danger',
    unknown: 'bg-text-muted',
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status ?? 'unknown']}`}
      title={status ?? 'unknown'}
    />
  )
}

type TabId = 'mcp' | 'env' | 'workers' | 'limits'

const TABS: { id: TabId; label: string }[] = [
  { id: 'mcp', label: 'MCP Servers' },
  { id: 'env', label: 'Environment' },
  { id: 'workers', label: 'Workers' },
  { id: 'limits', label: 'Limits' },
]

// ─── MCP Servers Section ──────────────────────────────────────────────────────

function MCPSection() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [health, setHealth] = useState<MCPHealth>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Add form
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('bat')
  const [newCommand, setNewCommand] = useState('')
  const [newArgs, setNewArgs] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sRes, hRes] = await Promise.all([
        fetch('/api/v1/config/mcp'),
        fetch('/api/v1/config/mcp/health'),
      ])
      if (sRes.ok) setServers(await sRes.json())
      if (hRes.ok) setHealth(await hRes.json())
    } catch {
      setError('Failed to load MCP config')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function flash(text: string, ok: boolean) {
    setActionMsg({ text, ok })
    setTimeout(() => setActionMsg(null), 3000)
  }

  async function handleRemove(name: string) {
    if (!confirm(`Remove MCP server "${name}"?`)) return
    const res = await fetch(`/api/v1/config/mcp/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (res.ok) {
      setServers(prev => prev.filter(s => s.name !== name))
      flash(`Removed ${name}`, true)
    } else {
      flash('Failed to remove server', false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const body: Record<string, unknown> = {
      name: newName,
      type: newType,
      command: newCommand,
    }
    if (newArgs.trim()) {
      body.args = newArgs.split('\n').map(a => a.trim()).filter(Boolean)
    }
    const res = await fetch('/api/v1/config/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      flash(`Added ${newName}`, true)
      setShowAdd(false)
      setNewName('')
      setNewType('bat')
      setNewCommand('')
      setNewArgs('')
      await fetchData()
    } else {
      flash('Failed to add server', false)
    }
    setAdding(false)
  }

  if (loading) return <div className="p-6 text-text-muted text-sm font-mono">Loading…</div>
  if (error) return <div className="p-6 text-danger text-sm font-mono">{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-primary">MCP Servers</h2>
        <div className="flex items-center gap-3">
          {actionMsg && (
            <span className={`text-xs font-mono ${actionMsg.ok ? 'text-success' : 'text-danger'}`}>
              {actionMsg.text}
            </span>
          )}
          <button
            onClick={() => setShowAdd(v => !v)}
            className="px-3 py-1 text-xs rounded bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 transition-colors"
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-bg border border-border rounded-lg p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <h3 className="col-span-full text-xs font-semibold text-text-muted uppercase tracking-wide">Add MCP Server</h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              placeholder="roblox-studio"
              className="bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/60"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Type</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/60"
            >
              <option value="bat">bat</option>
              <option value="url">url</option>
              <option value="stdio">stdio</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 col-span-full">
            <label className="text-xs text-text-muted">Command / URL</label>
            <input
              value={newCommand}
              onChange={e => setNewCommand(e.target.value)}
              required
              placeholder="%LOCALAPPDATA%\Roblox\mcp.bat"
              className="bg-surface border border-border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent/60"
            />
          </div>

          <div className="flex flex-col gap-1 col-span-full">
            <label className="text-xs text-text-muted">Args (one per line, optional)</label>
            <textarea
              value={newArgs}
              onChange={e => setNewArgs(e.target.value)}
              rows={3}
              placeholder="--port 3002"
              className="bg-surface border border-border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent/60 resize-none"
            />
          </div>

          <div className="col-span-full flex justify-end">
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 text-sm rounded bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add Server'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {servers.length === 0 && (
          <p className="text-text-muted text-sm col-span-full">No MCP servers configured.</p>
        )}
        {servers.map(server => (
          <div key={server.name} className="bg-bg border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HealthDot status={health[server.name]} />
                <span className="text-text-primary text-sm font-medium">{server.name}</span>
              </div>
              <button
                onClick={() => handleRemove(server.name)}
                className="text-xs text-danger hover:text-danger/80 transition-colors"
              >
                Remove
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-muted w-16 shrink-0">Type</span>
                <span className="font-mono text-accent">{server.type}</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <span className="text-text-muted w-16 shrink-0">Command</span>
                <span className="font-mono text-text-primary break-all">{server.command}</span>
              </div>
              {server.args && server.args.length > 0 && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-text-muted w-16 shrink-0">Args</span>
                  <span className="font-mono text-text-muted break-all">{server.args.join(' ')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Environment Section ──────────────────────────────────────────────────────

function EnvSection() {
  const [entries, setEntries] = useState<EnvEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/config/env')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setEntries(data); setLoading(false) })
      .catch(() => { setError('Failed to load environment config'); setLoading(false) })
  }, [])

  if (loading) return <div className="text-text-muted text-sm font-mono">Loading…</div>
  if (error) return <div className="text-danger text-sm font-mono">{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-primary">Environment Variables</h2>
        <span className="text-xs text-text-muted">Values are never shown for security</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-text-muted text-sm">No environment variables configured.</p>
      ) : (
        <div className="bg-bg border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-text-muted font-medium px-4 py-3 w-8"></th>
                <th className="text-left text-text-muted font-medium px-4 py-3">Key</th>
                <th className="text-left text-text-muted font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.key} className="border-b border-border hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${entry.has_value ? 'bg-success' : 'bg-danger'}`}
                      title={entry.has_value ? 'Set' : 'Not set'}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-text-primary">{entry.key}</td>
                  <td className="px-4 py-3 text-xs">
                    {entry.has_value ? (
                      <span className="text-success">Set</span>
                    ) : (
                      <span className="text-danger">Not set</span>
                    )}
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

// ─── Workers Section ──────────────────────────────────────────────────────────

function WorkersSection() {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/config/workers')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: { content?: string } | string) => {
        if (typeof data === 'string') setContent(data)
        else setContent(data.content ?? JSON.stringify(data, null, 2))
        setLoading(false)
      })
      .catch(() => { setError('Failed to load workers config'); setLoading(false) })
  }, [])

  if (loading) return <div className="text-text-muted text-sm font-mono">Loading…</div>
  if (error) return <div className="text-danger text-sm font-mono">{error}</div>

  return (
    <div>
      <h2 className="text-sm font-semibold text-text-primary mb-4">Workers</h2>
      <pre className="bg-bg border border-border rounded-lg p-4 font-mono text-sm text-text-primary overflow-x-auto whitespace-pre-wrap">
        {content || '(empty)'}
      </pre>
    </div>
  )
}

// ─── Limits Section ───────────────────────────────────────────────────────────

function LimitsSection() {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/config/limits')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: { content?: string } | string) => {
        if (typeof data === 'string') setContent(data)
        else setContent(data.content ?? JSON.stringify(data, null, 2))
        setLoading(false)
      })
      .catch(() => { setError('Failed to load limits config'); setLoading(false) })
  }, [])

  if (loading) return <div className="text-text-muted text-sm font-mono">Loading…</div>
  if (error) return <div className="text-danger text-sm font-mono">{error}</div>

  return (
    <div>
      <h2 className="text-sm font-semibold text-text-primary mb-4">Agent Limits</h2>
      <pre className="bg-bg border border-border rounded-lg p-4 font-mono text-sm text-text-primary overflow-x-auto whitespace-pre-wrap">
        {content || '(empty)'}
      </pre>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Config() {
  const [activeTab, setActiveTab] = useState<TabId>('mcp')

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-lg font-display font-semibold text-text-primary mb-6">Configuration</h1>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'mcp' && <MCPSection />}
        {activeTab === 'env' && <EnvSection />}
        {activeTab === 'workers' && <WorkersSection />}
        {activeTab === 'limits' && <LimitsSection />}
      </div>
    </div>
  )
}
