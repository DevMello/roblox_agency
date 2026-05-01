import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked'

interface SprintTask {
  id: string
  title: string
  status: TaskStatus
  worker_id?: string | null
  pr_number?: number | null
}

interface GameSummary {
  name: string
  sprint_status?: string
  sprint_id?: string
  done_tasks?: number
  total_tasks?: number
  open_blockers?: number
  tasks?: SprintTask[]
}

interface PRItem {
  number: number
  title: string
  branch: string
  url?: string
  diff_url?: string
  status: string
  game?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  done:    'bg-success',
  running: 'bg-accent animate-pulse',
  failed:  'bg-danger',
  blocked: 'bg-warning',
  pending: 'bg-text-muted',
}

function statusDot(status: string) {
  const cls = STATUS_DOT[status] ?? 'bg-text-muted'
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} flex-shrink-0`} />
}

// Simple inline markdown renderer — no external deps, handles # headings, - lists, blank lines
function SimpleMarkdown({ src }: { src: string }) {
  const lines = src.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^### /.test(line)) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-text-primary mt-4 mb-1">
          {line.slice(4)}
        </h3>
      )
    } else if (/^## /.test(line)) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-text-primary mt-5 mb-2 border-b border-border pb-1">
          {line.slice(3)}
        </h2>
      )
    } else if (/^# /.test(line)) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-accent mt-6 mb-2">
          {line.slice(2)}
        </h1>
      )
    } else if (/^- /.test(line) || /^\* /.test(line)) {
      // collect consecutive list items
      const items: string[] = []
      while (i < lines.length && (/^- /.test(lines[i]) || /^\* /.test(lines[i]))) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-0.5 my-2 text-text-primary text-sm">
          {items.map((it, j) => <li key={j}>{it}</li>)}
        </ul>
      )
      continue
    } else if (/^\d+\. /.test(line)) {
      // numbered list
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-0.5 my-2 text-text-primary text-sm">
          {items.map((it, j) => <li key={j}>{it}</li>)}
        </ol>
      )
      continue
    } else if (/^```/.test(line)) {
      // code block
      const codeLines: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="bg-bg border border-border rounded p-3 my-3 text-xs font-mono overflow-x-auto text-text-primary">
          {codeLines.join('\n')}
        </pre>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    } else if (/^\|/.test(line)) {
      // table — skip for now, render as pre
      const tableLines: string[] = []
      while (i < lines.length && /^\|/.test(lines[i])) {
        tableLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="bg-bg border border-border rounded p-2 my-2 text-xs font-mono overflow-x-auto text-text-muted">
          {tableLines.join('\n')}
        </pre>
      )
      continue
    } else {
      elements.push(
        <p key={i} className="text-sm text-text-primary leading-relaxed my-1">
          {line}
        </p>
      )
    }

    i++
  }

  return <div className="px-1">{elements}</div>
}

// ─── Donut SVG ────────────────────────────────────────────────────────────────

function DonutChart({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border, #333)" strokeWidth="12" />
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke="var(--color-accent, #6366f1)"
        strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Plan', 'Sprint Log', 'Progress', 'PRs', 'Reports', 'Overrides'] as const
type Tab = typeof TABS[number]

// ─── Tab content components ───────────────────────────────────────────────────

function OverviewTab({ game }: { game: GameSummary }) {
  const done = game.done_tasks ?? 0
  const total = game.total_tasks ?? 0
  const blockers = game.open_blockers ?? 0
  const tasks = game.tasks ?? []

  const statusCounts: Record<string, number> = {}
  for (const t of tasks) {
    statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Progress donut */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wide">Tasks</p>
          <div className="relative">
            <DonutChart done={done} total={total} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-text-primary font-mono">{total > 0 ? Math.round((done / total) * 100) : 0}%</span>
            </div>
          </div>
          <p className="text-sm text-text-muted font-mono">{done}/{total}</p>
        </div>

        {/* Status breakdown */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-3">Status Breakdown</p>
          <div className="space-y-2">
            {(['done', 'running', 'pending', 'failed', 'blocked'] as TaskStatus[]).map(s => (
              <div key={s} className="flex items-center gap-2 text-sm">
                {statusDot(s)}
                <span className="text-text-muted capitalize flex-1">{s}</span>
                <span className="font-mono text-text-primary">{statusCounts[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Blockers */}
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wide">Blockers</p>
          <div className="flex-1 flex items-center justify-center">
            <span className={`text-4xl font-bold font-mono ${blockers > 0 ? 'text-warning' : 'text-success'}`}>
              {blockers}
            </span>
          </div>
          <p className="text-xs text-text-muted text-center">
            {blockers === 0 ? 'No active blockers' : `${blockers} open blocker${blockers !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Task list */}
      {tasks.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">All Tasks</h3>
          </div>
          <div className="divide-y divide-border">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg/50 transition-colors">
                {statusDot(t.status)}
                <span className="font-mono text-xs text-accent/70 w-20 flex-shrink-0">{t.id}</span>
                <span className="text-sm text-text-primary flex-1 truncate">{t.title}</span>
                {t.worker_id && (
                  <span className="text-xs text-text-muted font-mono hidden sm:block">{t.worker_id}</span>
                )}
                {t.pr_number && (
                  <a
                    href={`#pr-${t.pr_number}`}
                    className="text-xs text-accent hover:underline font-mono"
                  >
                    #{t.pr_number}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-10 text-text-muted text-sm">
          No task data available. Run the planner to generate a sprint.
        </div>
      )}
    </div>
  )
}

function FileMarkdownTab({ url, label }: { url: string; label: string }) {
  const { data, isLoading, error } = useQuery<string>({
    queryKey: ['file', url],
    queryFn: async () => {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`${r.status}`)
      const json = await r.json()
      // API returns { content: "..." } or just the text
      return typeof json === 'string' ? json : (json.content ?? JSON.stringify(json, null, 2))
    },
    staleTime: 30000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-danger text-sm">Failed to load {label}</p>
        <p className="text-text-muted text-xs mt-1 font-mono">{url}</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 min-h-[300px]">
      {data ? <SimpleMarkdown src={data} /> : (
        <p className="text-text-muted text-sm text-center py-10">No content yet.</p>
      )}
    </div>
  )
}

function PRsTab({ game }: { game: string }) {
  const { data: prs, isLoading } = useQuery<PRItem[]>({
    queryKey: ['prs', game],
    queryFn: async () => {
      const r = await fetch('/api/v1/git/prs')
      if (!r.ok) throw new Error('Failed')
      const all: PRItem[] = await r.json()
      return all.filter((p) => !p.game || p.game === game)
    },
    staleTime: 30000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  const items = prs ?? []

  if (items.length === 0) {
    return <p className="text-text-muted text-sm text-center py-16">No pull requests found.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((pr) => (
        <div key={pr.number} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="font-mono text-accent text-sm flex-shrink-0">#{pr.number}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{pr.title}</p>
            <p className="text-xs text-text-muted font-mono mt-0.5">{pr.branch}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              pr.status === 'open'   ? 'bg-success/15 text-success border border-success/30' :
              pr.status === 'merged' ? 'bg-accent/15 text-accent border border-accent/30' :
              'bg-surface text-text-muted border border-border'
            }`}>
              {pr.status}
            </span>
            {(pr.url || pr.diff_url) && (
              <a
                href={pr.url ?? pr.diff_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline"
              >
                View →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportsTab({ game }: { game: string }) {
  const { data: files, isLoading } = useQuery<{ name: string }[]>({
    queryKey: ['dirs', 'reports/morning', game],
    queryFn: async () => {
      const r = await fetch('/api/v1/dirs/reports/morning')
      return r.ok ? r.json() : []
    },
    staleTime: 60000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  const reports = (files ?? [])
    .filter((f) => f.name.endsWith('.md'))
    .sort((a, b) => b.name.localeCompare(a.name))

  if (reports.length === 0) {
    return <p className="text-text-muted text-sm text-center py-16">No morning reports found.</p>
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Morning Reports</h3>
      </div>
      <div className="divide-y divide-border">
        {reports.map((r) => (
          <Link
            key={r.name}
            to={`/repo/reports/morning/${r.name}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-bg/50 transition-colors"
          >
            <span className="text-accent/60 text-sm">📄</span>
            <span className="font-mono text-sm text-text-primary">{r.name.replace('.md', '')}</span>
            <span className="ml-auto text-accent/50 text-xs">→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function OverridesTab({ game }: { game: string }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  const { data: current, isLoading } = useQuery<{ content?: string; text?: string } | string>({
    queryKey: ['overrides', game],
    queryFn: async () => {
      const r = await fetch(`/api/v1/games/${game}/overrides`)
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    staleTime: 30000,
  })

  const currentText =
    typeof current === 'string' ? current :
    current?.content ?? current?.text ?? ''

  const mutation = useMutation({
    mutationFn: async (payload: string) => {
      const r = await fetch(`/api/v1/games/${game}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: payload }),
      })
      if (!r.ok) throw new Error(`${r.status}`)
    },
    onSuccess: () => {
      setSaved(true)
      setText('')
      qc.invalidateQueries({ queryKey: ['overrides', game] })
      setTimeout(() => setSaved(false), 3000)
    },
  })

  return (
    <div className="space-y-6">
      {/* Current overrides */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Current Overrides</h3>
          {isLoading && <div className="w-3 h-3 border border-accent/30 border-t-accent rounded-full animate-spin" />}
        </div>
        <div className="p-4">
          {currentText ? (
            <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap leading-relaxed">{currentText}</pre>
          ) : (
            <p className="text-text-muted text-sm">No overrides currently active.</p>
          )}
        </div>
      </div>

      {/* Add override form */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Add Override</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Appended to <code className="font-mono">memory/human-overrides.md</code>
          </p>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Enter override text... e.g. 'Do not change the respawn system until further notice.'"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-y"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (text.trim()) mutation.mutate(text.trim())
              }}
              disabled={!text.trim() || mutation.isPending}
              className="px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Saving...' : 'Post Override'}
            </button>
            {saved && <span className="text-success text-sm">Override posted.</span>}
            {mutation.isError && (
              <span className="text-danger text-sm">Failed to post — check server.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function GameDetail() {
  const { game } = useParams<{ game: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const { data: gameData, isLoading, error } = useQuery<GameSummary>({
    queryKey: ['game', game],
    queryFn: async () => {
      const r = await fetch(`/api/v1/games/${game}`)
      if (!r.ok) throw new Error('Failed to load game')
      return r.json()
    },
    enabled: !!game,
    staleTime: 15000,
    refetchInterval: 30000,
  })

  const slug = game ?? ''
  const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const sprintStatus = gameData?.sprint_status
  const sprintId = gameData?.sprint_id

  const sprintBadgeColors: Record<string, string> = {
    active:   'bg-success/15 text-success border-success/30',
    complete: 'bg-accent/15 text-accent border-accent/30',
    planning: 'bg-warning/15 text-warning border-warning/30',
  }
  const sprintBadgeCls =
    sprintBadgeColors[sprintStatus ?? ''] ?? 'bg-surface text-text-muted border-border'

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-bg/80 backdrop-blur sticky top-0 z-20">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
          <Link to="/projects" className="hover:text-text-primary transition-colors">
            Projects
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">{displayName}</span>
        </nav>

        {/* Title row */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display font-bold text-text-primary text-xl">{displayName}</h1>

          {sprintStatus && (
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${sprintBadgeCls}`}>
              {sprintStatus}
            </span>
          )}

          {sprintId && (
            <span className="font-mono text-xs text-text-muted bg-surface border border-border rounded px-2 py-0.5">
              {sprintId}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Link
              to={`/projects/${slug}/run`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              &#9654; Run
            </Link>
            <Link
              to={`/projects/${slug}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-text-primary rounded-md text-sm font-medium hover:border-accent/40 transition-colors"
            >
              &#9998; Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border px-6 bg-bg sticky top-[73px] z-10">
        <div className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2
                ${activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-border'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="text-center py-20">
            <p className="text-danger text-sm">Failed to load game data</p>
            <p className="text-text-muted text-xs mt-1 font-mono">/api/v1/games/{slug}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {activeTab === 'Overview' && (
              <OverviewTab game={gameData ?? { name: slug }} />
            )}
            {activeTab === 'Plan' && (
              <FileMarkdownTab
                url={`/api/v1/files/games/${slug}/plan.md`}
                label="plan.md"
              />
            )}
            {activeTab === 'Sprint Log' && (
              <FileMarkdownTab
                url={`/api/v1/files/games/${slug}/sprint-log.md`}
                label="sprint-log.md"
              />
            )}
            {activeTab === 'Progress' && (
              <FileMarkdownTab
                url={`/api/v1/files/games/${slug}/progress.md`}
                label="progress.md"
              />
            )}
            {activeTab === 'PRs' && (
              <PRsTab game={slug} />
            )}
            {activeTab === 'Reports' && (
              <ReportsTab game={slug} />
            )}
            {activeTab === 'Overrides' && (
              <OverridesTab game={slug} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
