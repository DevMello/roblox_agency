import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DirEntry {
  name: string
  path: string
  is_dir: boolean
  size?: number
  modified?: string
}

interface FileData {
  content: string
  size: number
  modified?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROTECTED = ['memory/human-overrides.md', 'agents/', 'config/', 'workflows/', 'specs/']

function isProtected(path: string): boolean {
  return PROTECTED.some(p => path === p || path.startsWith(p))
}

function isMarkdown(name: string): boolean {
  return name.endsWith('.md') || name.endsWith('.mdx')
}

function formatSize(bytes?: number): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────

function SimpleMarkdown({ content }: { content: string }) {
  // Convert basic markdown to styled HTML-like elements inline
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Heading H1
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold text-text-primary mt-6 mb-3 border-b border-border pb-2">
          {line.slice(2)}
        </h1>
      )
    }
    // Heading H2
    else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-xl font-semibold text-text-primary mt-5 mb-2">
          {line.slice(3)}
        </h2>
      )
    }
    // Heading H3
    else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-lg font-semibold text-text-primary mt-4 mb-2">
          {line.slice(4)}
        </h3>
      )
    }
    // Code block
    else if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="bg-surface border border-border rounded-lg p-4 overflow-x-auto my-3 text-sm font-mono text-text-primary">
          {lang && <div className="text-text-muted text-xs mb-2">{lang}</div>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
    }
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-border my-4" />)
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-accent pl-4 italic text-text-muted my-2 text-sm">
          {line.slice(2)}
        </blockquote>
      )
    }
    // Unordered list
    else if (/^[-*+] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-1 my-2 text-text-primary text-sm pl-2">
          {items.map((item, idx) => <li key={idx}>{item}</li>)}
        </ul>
      )
      continue
    }
    // Ordered list
    else if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-1 my-2 text-text-primary text-sm pl-2">
          {items.map((item, idx) => <li key={idx}>{item}</li>)}
        </ol>
      )
      continue
    }
    // Table (basic — header row detection)
    else if (line.includes('|') && lines[i + 1]?.includes('---')) {
      const headers = line.split('|').map(c => c.trim()).filter(Boolean)
      i++ // skip separator
      const rows: string[][] = []
      i++
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean))
        i++
      }
      elements.push(
        <div key={i} className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="text-left text-text-muted font-medium border-b border-border pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-surface/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="text-text-primary border-b border-border py-2 pr-4">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }
    // Blank line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    }
    // Regular paragraph
    else {
      // Inline code
      const parts = line.split(/(`[^`]+`)/)
      const rendered = parts.map((p, pi) =>
        p.startsWith('`') && p.endsWith('`')
          ? <code key={pi} className="font-mono text-xs bg-surface px-1.5 py-0.5 rounded text-accent">{p.slice(1, -1)}</code>
          : <span key={pi}>{p}</span>
      )
      elements.push(
        <p key={i} className="text-text-primary text-sm leading-relaxed my-1">{rendered}</p>
      )
    }

    i++
  }

  return <div className="prose-agency max-w-none">{elements}</div>
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RepoExplorer() {
  const params = useParams<{ '*': string }>()
  const navigate = useNavigate()
  const currentPath = params['*'] ?? ''

  const [dirEntries, setDirEntries] = useState<DirEntry[] | null>(null)
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [isDirectory, setIsDirectory] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDirEntries(null)
    setFileData(null)
    setIsDirectory(null)
    setEditMode(false)
    setSaveMsg(null)

    // Try directory first, then file
    const encodedPath = currentPath ? encodeURIComponent(currentPath) : ''
    const dirUrl = currentPath
      ? `/api/v1/dirs/${encodedPath}`
      : `/api/v1/dirs/`

    try {
      const dirRes = await fetch(dirUrl)
      if (dirRes.ok) {
        const data = await dirRes.json() as DirEntry[]
        setDirEntries(data)
        setIsDirectory(true)
        setLoading(false)
        return
      }
    } catch {
      // fall through to file attempt
    }

    if (currentPath) {
      const fileUrl = `/api/v1/files/${encodeURIComponent(currentPath)}`
      try {
        const fileRes = await fetch(fileUrl)
        if (fileRes.status === 404) {
          setError('404 — path not found')
          setLoading(false)
          return
        }
        if (fileRes.ok) {
          const data = await fileRes.json() as FileData
          setFileData(data)
          setIsDirectory(false)
          setLoading(false)
          return
        }
        setError(`Server error: ${fileRes.status}`)
      } catch (e) {
        setError('Network error')
      }
    } else {
      setError('Could not load directory')
    }

    setLoading(false)
  }, [currentPath])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!currentPath) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`/api/v1/files/${encodeURIComponent(currentPath)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      if (res.ok) {
        setSaveMsg('Saved successfully')
        setFileData(prev => prev ? { ...prev, content: editContent } : prev)
        setEditMode(false)
      } else {
        setSaveMsg(`Save failed: ${res.status}`)
      }
    } catch {
      setSaveMsg('Save failed: network error')
    }
    setSaving(false)
  }

  // ─── Breadcrumb ────────────────────────────────────────────────────────────

  const pathSegments = currentPath ? currentPath.split('/').filter(Boolean) : []
  const breadcrumbs: { label: string; path: string }[] = [
    { label: 'repo', path: '' },
    ...pathSegments.map((seg, idx) => ({
      label: seg,
      path: pathSegments.slice(0, idx + 1).join('/'),
    })),
  ]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-lg font-display font-semibold text-text-primary mb-2">Repo Explorer</h1>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm font-mono text-text-muted flex-wrap">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {idx > 0 && <span className="text-border">/</span>}
              {idx === breadcrumbs.length - 1 ? (
                <span className="text-text-primary">{crumb.label}</span>
              ) : (
                <Link
                  to={crumb.path ? `/repo/${crumb.path}` : '/repo'}
                  className="hover:text-accent transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 bg-surface border border-border rounded-lg overflow-hidden">
        {loading && (
          <div className="p-8 text-text-muted text-sm font-mono">Loading…</div>
        )}

        {!loading && error && (
          <div className="p-8">
            <div className="text-danger font-mono text-sm">{error}</div>
            <button
              onClick={() => navigate('/repo')}
              className="mt-4 text-accent text-sm hover:underline"
            >
              ← Back to root
            </button>
          </div>
        )}

        {/* Directory Listing */}
        {!loading && !error && isDirectory && dirEntries && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-text-muted font-medium px-4 py-3 w-8"></th>
                <th className="text-left text-text-muted font-medium px-4 py-3">Name</th>
                <th className="text-left text-text-muted font-medium px-4 py-3 w-32">Size</th>
                <th className="text-left text-text-muted font-medium px-4 py-3 w-48">Modified</th>
              </tr>
            </thead>
            <tbody>
              {currentPath && (
                <tr className="border-b border-border hover:bg-border/30 transition-colors">
                  <td className="px-4 py-2 text-text-muted">📁</td>
                  <td className="px-4 py-2" colSpan={3}>
                    <Link
                      to={pathSegments.length > 1 ? `/repo/${pathSegments.slice(0, -1).join('/')}` : '/repo'}
                      className="text-accent hover:underline font-mono"
                    >
                      ..
                    </Link>
                  </td>
                </tr>
              )}
              {dirEntries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                    Empty directory
                  </td>
                </tr>
              )}
              {dirEntries
                .sort((a, b) => {
                  if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1
                  return a.name.localeCompare(b.name)
                })
                .map(entry => {
                  const href = `/repo/${entry.path}`
                  return (
                    <tr key={entry.path} className="border-b border-border hover:bg-border/30 transition-colors">
                      <td className="px-4 py-2 text-text-muted">
                        {entry.is_dir ? '📁' : '📄'}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          to={href}
                          className="text-accent hover:underline font-mono text-sm"
                        >
                          {entry.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-text-muted font-mono text-xs">
                        {entry.is_dir ? '—' : formatSize(entry.size)}
                      </td>
                      <td className="px-4 py-2 text-text-muted text-xs">
                        {formatDate(entry.modified)}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}

        {/* File View */}
        {!loading && !error && isDirectory === false && fileData && (
          <div className="h-full flex flex-col">
            {/* File meta + actions */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/80">
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-text-muted">
                  {formatSize(fileData.size)}
                </span>
                {fileData.modified && (
                  <span className="font-mono text-xs text-text-muted">
                    Modified: {formatDate(fileData.modified)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {saveMsg && (
                  <span className={`text-xs font-mono ${saveMsg.startsWith('Saved') ? 'text-success' : 'text-danger'}`}>
                    {saveMsg}
                  </span>
                )}
                {!isProtected(currentPath) && !editMode && (
                  <button
                    onClick={() => {
                      setEditContent(fileData.content)
                      setEditMode(true)
                    }}
                    className="px-3 py-1 text-xs rounded bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {editMode && (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1 text-xs rounded bg-success/20 text-success border border-success/30 hover:bg-success/30 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditMode(false); setSaveMsg(null) }}
                      className="px-3 py-1 text-xs rounded bg-surface text-text-muted border border-border hover:bg-border/50 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* File Content */}
            <div className="flex-1 overflow-auto p-6">
              {editMode ? (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[60vh] bg-bg border border-border rounded-lg p-4 font-mono text-sm text-text-primary resize-none focus:outline-none focus:border-accent/60"
                  spellCheck={false}
                />
              ) : isMarkdown(currentPath.split('/').pop() ?? '') ? (
                <SimpleMarkdown content={fileData.content} />
              ) : (
                <pre className="font-mono text-sm text-text-primary whitespace-pre-wrap break-words">
                  {fileData.content}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
