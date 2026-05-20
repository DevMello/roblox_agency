// Page · /repo — Repo Explorer (map · tree · graph views + file viewer)
import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API = '/api/v1'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DirEntry {
  name: string
  path: string
  kind: 'file' | 'dir'
  size: number
  modified: string
}

interface Branch {
  name: string
  is_current: boolean
  last_commit_sha: string
  last_commit_message: string
}

interface Commit {
  sha: string
  message: string
  author: string
  date: string
  files?: string[]
}

interface FileData {
  path: string
  content: string
  size: number
  modified: number
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchDir(path: string): Promise<DirEntry[]> {
  const url = path ? `${API}/files/dirs/${path}` : `${API}/files/dirs/`
  const r = await fetch(url)
  if (!r.ok) return []
  return r.json()
}

async function fetchFile(path: string): Promise<FileData> {
  const r = await fetch(`${API}/files/${path}`)
  if (!r.ok) throw new Error('Not found')
  return r.json()
}

async function saveFile(path: string, content: string): Promise<void> {
  const r = await fetch(`${API}/files/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!r.ok) throw new Error('Save failed')
}

async function fetchBranches(): Promise<Branch[]> {
  const r = await fetch(`${API}/git/branches`)
  if (!r.ok) return []
  return r.json()
}

async function fetchLog(n = 40): Promise<Commit[]> {
  const r = await fetch(`${API}/git/log?n=${n}`)
  if (!r.ok) return []
  return r.json()
}

async function fetchTree(): Promise<{ path: string; size: number }[]> {
  const r = await fetch(`${API}/git/tree`)
  if (!r.ok) return []
  return r.json()
}

async function checkoutBranch(branch: string): Promise<void> {
  await fetch(`${API}/git/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branch }),
  })
}

// ─── Relative time ───────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function FolderIcon({ size = 14, color = 'var(--muted)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ color, flexShrink: 0 }}>
      <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6L7.5 4H13.5A1 1 0 0 1 14.5 5V12.5A1 1 0 0 1 13.5 13.5H2.5A1 1 0 0 1 1.5 12.5V3.5Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  )
}

function FileIcon({ size = 14, color = 'var(--muted)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ color, flexShrink: 0 }}>
      <path d="M3 2.5A1 1 0 0 1 4 1.5H9.5L13 5V13.5A1 1 0 0 1 12 14.5H4A1 1 0 0 1 3 13.5V2.5Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function SearchIcon({ size = 14, color = 'var(--muted)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ color, flexShrink: 0 }}>
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function BranchIcon({ size = 13, color = 'var(--muted)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ color, flexShrink: 0 }}>
      <circle cx="4" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 4.5V11.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 4.5C4 7 12 7.5 12 7.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function ChevronIcon({ open, size = 12 }: { open: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
      <path d="M4 2.5L8 6L4 9.5" stroke="var(--muted)" strokeWidth="1.3" strokeLinecap="round" />
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

// ─── Tree node (recursive) ───────────────────────────────────────────────────

interface TreeNodeProps {
  entry: DirEntry
  depth: number
  onFileClick: (path: string) => void
  selectedFile: string | null
}

function TreeNode({ entry, depth, onFileClick, selectedFile }: TreeNodeProps) {
  const [open, setOpen] = useState(depth === 0)
  const { data: children } = useQuery({
    queryKey: ['dir', entry.path],
    queryFn: () => fetchDir(entry.path),
    enabled: entry.kind === 'dir' && open,
  })

  const isSelected = selectedFile === entry.path
  const indent = depth * 16

  if (entry.kind === 'file') {
    const ext = entry.name.split('.').pop() ?? ''
    return (
      <div
        onClick={() => onFileClick(entry.path)}
        style={{
          paddingLeft: 10 + indent,
          paddingRight: 10,
          paddingTop: 5,
          paddingBottom: 5,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          borderRadius: 5,
          background: isSelected ? 'rgba(124,111,255,0.12)' : 'transparent',
          color: isSelected ? 'var(--accent)' : 'var(--ink-dim)',
        }}
        className="card-hover"
      >
        <div style={{ width: 12, flexShrink: 0 }} />
        <FileIcon size={13} color={isSelected ? 'var(--accent)' : 'var(--muted)'} />
        <span className="t-mono" style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </span>
        <span className="t-mono t-xs" style={{ color: 'var(--muted)', flexShrink: 0 }}>
          {ext}
        </span>
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          paddingLeft: 10 + indent,
          paddingRight: 10,
          paddingTop: 5,
          paddingBottom: 5,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          borderRadius: 5,
        }}
        className="card-hover"
      >
        <ChevronIcon open={open} size={12} />
        <FolderIcon size={13} color={open ? 'var(--accent-soft)' : 'var(--muted)'} />
        <span className="t-mono" style={{ fontSize: 12, fontWeight: 500, color: open ? 'var(--ink)' : 'var(--ink-dim)' }}>
          {entry.name}
        </span>
        <span className="t-mono t-xs t-muted" style={{ marginLeft: 'auto' }}>
          {children ? children.length : '…'}
        </span>
      </div>
      {open && children && (
        <div>
          {children
            .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1))
            .map(child => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                onFileClick={onFileClick}
                selectedFile={selectedFile}
              />
            ))}
        </div>
      )}
    </div>
  )
}

// ─── Map tile ────────────────────────────────────────────────────────────────

const ACCENT_DIRS = new Set(['games', 'memory', 'reports'])
const LOCKED_DIRS = new Set(['agents', 'workflows', 'scripts', '.github', 'bin'])

function ext(name: string) { return name.split('.').pop() ?? '' }

function fileColor(name: string) {
  const e = ext(name)
  if (e === 'md') return 'var(--accent-soft)'
  if (e === 'py') return '#4ec9b0'
  if (e === 'json') return '#dcdcaa'
  if (e === 'ts' || e === 'tsx') return '#569cd6'
  if (e === 'sh' || e === 'ps1') return '#ce9178'
  return 'var(--muted)'
}

interface MapTileProps {
  entry: DirEntry
  games?: string[]
  onFileClick: (path: string) => void
}

function MapTile({ entry, games, onFileClick }: MapTileProps) {
  const isAccent = ACCENT_DIRS.has(entry.name)
  const isLocked = LOCKED_DIRS.has(entry.name)

  return (
    <div
      onClick={() => entry.kind === 'file' ? onFileClick(entry.path) : undefined}
      style={{
        border: `1px solid ${isAccent ? 'var(--accent)' : isLocked ? 'var(--border)' : 'var(--border-2)'}`,
        background: isAccent
          ? 'linear-gradient(135deg, rgba(124,111,255,0.12), rgba(124,111,255,0.02))'
          : 'var(--surface)',
        borderRadius: 10,
        padding: 12,
        opacity: isLocked ? 0.6 : 1,
        cursor: entry.kind === 'file' ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: 72,
        overflow: 'hidden',
      }}
      className={entry.kind === 'file' ? 'card-hover' : ''}
    >
      <div className="row gap-6">
        {entry.kind === 'dir'
          ? <FolderIcon size={14} color={isAccent ? 'var(--accent-soft)' : 'var(--muted)'} />
          : <FileIcon size={14} color={fileColor(entry.name)} />}
        <span className="t-mono" style={{ fontSize: 12, fontWeight: 500, color: isAccent ? 'var(--ink)' : 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </span>
        <div className="spacer" />
        {isLocked && <span style={{ fontSize: 10 }}>🔒</span>}
      </div>
      <div className="t-mono t-xs t-muted">
        {relTime(entry.modified)}
      </div>
      {entry.name === 'games' && games && games.length > 0 && (
        <div className="col gap-4" style={{ marginTop: 4 }}>
          {games.slice(0, 3).map(g => (
            <div key={g} className="row gap-6" style={{ background: 'rgba(10,10,15,0.4)', padding: '4px 7px', borderRadius: 5, border: '1px solid var(--border)' }}>
              <span className="dot dot-live" style={{ width: 5, height: 5 }} />
              <span className="t-mono" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── File viewer panel ───────────────────────────────────────────────────────

interface FilePanelProps {
  path: string
  onClose: () => void
}

const WRITE_ALLOWED = /\.(md|json|toml|yaml|yml|txt)$/i
const PROTECTED = /^(agents\/|config\/|workflows\/)/

function FilePanel({ path, onClose }: FilePanelProps) {
  const qc = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [preview, setPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['file', path],
    queryFn: () => fetchFile(path),
  })

  useEffect(() => {
    setEditMode(false)
    setPreview(false)
  }, [path])

  useEffect(() => {
    if (data && editMode) setDraft(data.content)
  }, [editMode, data])

  const { data: history } = useQuery({
    queryKey: ['file-history', path],
    queryFn: async () => {
      const r = await fetch(`${API}/git/file-history?path=${encodeURIComponent(path)}&n=5`)
      if (!r.ok) return []
      return r.json() as Promise<Commit[]>
    },
  })

  const saveMut = useMutation({
    mutationFn: () => saveFile(path, draft),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['file', path] })
      setEditMode(false)
    },
  })

  const isMarkdown = path.endsWith('.md')
  const isJson = path.endsWith('.json')
  const canWrite = WRITE_ALLOWED.test(path) && !PROTECTED.test(path)

  return (
    <div style={{
      width: 480,
      flexShrink: 0,
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface)',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="row gap-8" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <FileIcon size={13} color={fileColor(path.split('/').pop() ?? '')} />
        <span className="t-mono" style={{ fontSize: 12, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {path}
        </span>
        <div className="row gap-6">
          {isMarkdown && !editMode && (
            <button className="btn btn-sm btn-ghost" onClick={() => setPreview(p => !p)}>
              {preview ? 'Raw' : 'Preview'}
            </button>
          )}
          {canWrite && !editMode && (
            <button className="btn btn-sm btn-ghost" onClick={() => setEditMode(true)}>Edit</button>
          )}
          {editMode && (
            <>
              {isMarkdown && (
                <button className="btn btn-sm btn-ghost" onClick={() => setPreview(p => !p)}>
                  {preview ? 'Edit' : 'Preview'}
                </button>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => setEditMode(false)}>Cancel</button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
          <button className="btn btn-sm btn-ghost" style={{ padding: '3px 7px' }} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {isLoading && <div className="t-muted t-sm" style={{ padding: 24 }}>Loading…</div>}
        {isError && <div className="t-muted t-sm" style={{ padding: 24 }}>Failed to load file.</div>}
        {data && !editMode && (
          <>
            {isMarkdown && preview ? (
              <div className="markdown-body" style={{ fontSize: 13, lineHeight: 1.7 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
              </div>
            ) : (
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.6,
                color: 'var(--ink-dim)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0,
              }}>
                {data.content}
              </pre>
            )}
          </>
        )}
        {editMode && (
          <>
            {preview && isMarkdown ? (
              <div className="markdown-body" style={{ fontSize: 13, lineHeight: 1.7 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: 400,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  lineHeight: 1.6,
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: 12,
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Footer: file meta + history */}
      {data && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', flexShrink: 0 }}>
          <div className="row gap-16" style={{ marginBottom: 8 }}>
            <span className="t-mono t-xs t-muted">{Math.round(data.size / 1024 * 10) / 10} KB</span>
            <span className="t-mono t-xs t-muted">{new Date(data.modified * 1000).toLocaleString()}</span>
          </div>
          {history && history.length > 0 && (
            <div>
              <div className="t-xs t-muted" style={{ marginBottom: 6 }}>Recent commits</div>
              {history.slice(0, 3).map(c => (
                <div key={c.sha} className="row gap-8" style={{ marginBottom: 4 }}>
                  <span className="t-mono" style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>
                    {c.sha.slice(0, 7)}
                  </span>
                  <span className="t-xs t-muted" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.message}
                  </span>
                  <span className="t-mono t-xs t-muted" style={{ flexShrink: 0 }}>{relTime(c.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Palette ─────────────────────────────────────────────────────────────────

interface PaletteProps {
  onClose: () => void
  onOpen: (path: string) => void
}

function Palette({ onClose, onOpen }: PaletteProps) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)

  const { data: tree } = useQuery({
    queryKey: ['git-tree'],
    queryFn: fetchTree,
    staleTime: 60_000,
  })

  const filtered = (tree ?? [])
    .filter(f => q ? f.path.toLowerCase().includes(q.toLowerCase()) : true)
    .slice(0, 50)

  useEffect(() => { setIdx(0) }, [q])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && filtered[idx]) { onOpen(filtered[idx].path); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, idx, onClose, onOpen])

  const extOf = (p: string) => p.split('.').pop() ?? ''

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
      onClick={onClose}
    >
      <div
        style={{ width: 600, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="row gap-10" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <SearchIcon size={16} color="var(--muted)" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search files by name or path…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink)', fontSize: 14, fontFamily: 'var(--font-mono)' }}
          />
          <span className="kbd">esc</span>
        </div>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {filtered.length === 0
            ? <div style={{ padding: 24, textAlign: 'center' }} className="t-muted t-sm">No matches.</div>
            : filtered.map((f, i) => (
              <div
                key={f.path}
                onClick={() => { onOpen(f.path); onClose() }}
                onMouseEnter={() => setIdx(i)}
                style={{
                  padding: '9px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: i === idx ? 'rgba(124,111,255,0.1)' : 'transparent',
                  borderTop: i ? '1px solid var(--border)' : 'none',
                }}
              >
                <FileIcon size={13} color={fileColor(f.path.split('/').pop() ?? '')} />
                <span className="t-mono" style={{ fontSize: 12, flex: 1 }}>{f.path}</span>
                <span className="t-mono t-xs t-muted">{extOf(f.path)}</span>
                {f.size > 0 && <span className="t-mono t-xs t-muted">{Math.round(f.size / 1024 * 10) / 10}KB</span>}
              </div>
            ))
          }
        </div>
        <div className="row gap-16" style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
          <KbdHint k="↑↓" l="navigate" />
          <KbdHint k="↵" l="open" />
          <div className="spacer" />
          <span className="t-mono t-xs t-muted">{filtered.length} {tree ? `of ${tree.length}` : ''}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Graph view ───────────────────────────────────────────────────────────────

function GraphView({ onFileClick }: { onFileClick: (p: string) => void }) {
  const { data: commits, isLoading } = useQuery({
    queryKey: ['git-log'],
    queryFn: () => fetchLog(60),
    staleTime: 30_000,
  })

  if (isLoading) return <div className="t-muted t-sm" style={{ padding: 32 }}>Loading commit graph…</div>
  if (!commits || commits.length === 0) return <div className="t-muted t-sm" style={{ padding: 32 }}>No commits.</div>

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14 }}>Commit history · {commits.length}</h3>
      </div>
      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
        {commits.map((c, i) => (
          <div
            key={c.sha}
            style={{
              display: 'flex',
              gap: 0,
              borderTop: i ? '1px solid var(--border)' : 'none',
            }}
          >
            {/* Graph lane */}
            <div style={{ width: 40, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)', zIndex: 1 }} />
              {i < commits.length - 1 && (
                <div style={{ width: 2, flex: 1, background: 'var(--border-2)', marginTop: 2 }} />
              )}
            </div>

            {/* Commit detail */}
            <div style={{ flex: 1, padding: '10px 14px 10px 0', minWidth: 0 }}>
              <div className="row gap-8" style={{ marginBottom: 4 }}>
                <span className="t-mono" style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>{c.sha.slice(0, 7)}</span>
                <span className="t-xs t-muted" style={{ flexShrink: 0 }}>{relTime(c.date)}</span>
                <span className="t-xs t-muted" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.author.split('<')[0].trim()}</span>
              </div>
              <div className="t-sm" style={{ color: 'var(--ink-dim)', marginBottom: 6, lineHeight: 1.4 }}>
                {c.message}
              </div>
              {c.files && c.files.length > 0 && (
                <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
                  {c.files.slice(0, 8).map(f => (
                    <span
                      key={f}
                      className="t-mono"
                      onClick={() => onFileClick(f)}
                      style={{ fontSize: 11, color: 'var(--muted)', cursor: 'pointer', padding: '1px 5px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}
                      title={f}
                    >
                      {f.split('/').pop()}
                    </span>
                  ))}
                  {c.files.length > 8 && (
                    <span className="t-mono t-xs t-muted">+{c.files.length - 8}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type View = 'map' | 'tree' | 'graph'

export default function RepoExplorer() {
  const qc = useQueryClient()
  const [view, setView] = useState<View>('map')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [branchMenuOpen, setBranchMenuOpen] = useState(false)

  // Data
  const { data: rootEntries = [], isLoading: rootLoading } = useQuery({
    queryKey: ['dir', ''],
    queryFn: () => fetchDir(''),
    staleTime: 30_000,
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
    staleTime: 20_000,
  })

  const { data: recentCommits = [] } = useQuery({
    queryKey: ['git-log'],
    queryFn: () => fetchLog(40),
    staleTime: 30_000,
  })

  // Derived
  const currentBranch = branches.find(b => b.is_current)
  const openPRs = branches.filter(b => !b.is_current)

  // Recently changed files: flatten commits → unique files with first occurrence time
  const recentFiles = (() => {
    const seen = new Map<string, { date: string; author: string; message: string }>()
    for (const c of recentCommits) {
      for (const f of (c.files ?? [])) {
        if (!seen.has(f)) seen.set(f, { date: c.date, author: c.author.split('<')[0].trim(), message: c.message })
      }
    }
    return Array.from(seen.entries()).slice(0, 12).map(([path, meta]) => ({ path, ...meta }))
  })()

  // Game slugs from DB
  const { data: gamesData } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const r = await fetch(`${API}/games/`)
      if (!r.ok) return []
      return r.json() as Promise<{ slug: string; status: string }[]>
    },
    staleTime: 60_000,
  })
  const gameSlugs = (gamesData ?? []).map(g => g.slug)

  const checkoutMut = useMutation({
    mutationFn: checkoutBranch,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['branches'] })
      setBranchMenuOpen(false)
    },
  })

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false)
        setBranchMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleFileClick = useCallback((path: string) => {
    setSelectedFile(path)
  }, [])

  // Sort root entries: dirs first, then files; dotfiles last
  const sortedRoot = [...rootEntries].sort((a, b) => {
    const aDot = a.name.startsWith('.') ? 1 : 0
    const bDot = b.name.startsWith('.') ? 1 : 0
    if (aDot !== bDot) return aDot - bDot
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div className="topbar">
        <div className="crumbs" style={{ flex: 1, minWidth: 0 }}>
          <span className="crumb root">Snapblox</span>
          <span className="sep">/</span>
          <span className="crumb">Repository</span>
          <span className="sep">/</span>
          <span className="crumb last">{view}</span>
        </div>
        <button className="btn btn-sm" onClick={() => setPaletteOpen(true)}>
          <SearchIcon size={13} color="currentColor" />
          Search files
          <span className="kbd" style={{ marginLeft: 4 }}>⌘K</span>
        </button>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>
          {/* Page head */}
          <div className="page-head" style={{ marginBottom: 20 }}>
            <div>
              <p className="text-cap" style={{ marginBottom: 6 }}>Repository</p>
              <h1>Repo {view}</h1>
              <p className="lead">
                {view === 'map' && 'Every folder in the agent stack. Locked nodes are agent-owned.'}
                {view === 'tree' && 'Browse and open any tracked file.'}
                {view === 'graph' && 'Commit history with changed files.'}
              </p>
            </div>
            <div className="row gap-6">
              {(['map', 'tree', 'graph'] as View[]).map(v => (
                <button
                  key={v}
                  className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setView(v)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {v}
                </button>
              ))}
              <div style={{ width: 12 }} />
              {/* Branch switcher */}
              <div style={{ position: 'relative' }}>
                <button
                  className="btn"
                  onClick={() => setBranchMenuOpen(o => !o)}
                >
                  <BranchIcon size={13} color="currentColor" />
                  {currentBranch?.name ?? 'loading…'} ▾
                </button>
                {branchMenuOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 300,
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100, overflow: 'hidden',
                  }}>
                    <div className="t-xs t-muted" style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                      {branches.length} branches
                    </div>
                    {branches.map(b => (
                      <div
                        key={b.name}
                        onClick={() => !b.is_current && checkoutMut.mutate(b.name)}
                        className="row gap-8 card-hover"
                        style={{
                          padding: '9px 14px',
                          cursor: b.is_current ? 'default' : 'pointer',
                          borderTop: '1px solid var(--border)',
                          opacity: checkoutMut.isPending ? 0.5 : 1,
                        }}
                      >
                        <BranchIcon size={12} color={b.is_current ? 'var(--accent)' : 'var(--muted)'} />
                        <span className="t-mono" style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: b.is_current ? 'var(--ink)' : 'var(--ink-dim)', fontWeight: b.is_current ? 600 : 400 }}>
                          {b.name}
                        </span>
                        {b.is_current && <span className="chip chip-accent">current</span>}
                        <span className="t-mono t-xs t-muted">{b.last_commit_sha.slice(0, 7)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Map view ── */}
          {view === 'map' && (
            <>
              <div className="card glow-violet fade-up d-1" style={{ padding: 22, marginBottom: 20 }}>
                <div className="row" style={{ marginBottom: 14 }}>
                  <span className="text-cap">
                    {currentBranch ? `${currentBranch.name} @ ${currentBranch.last_commit_sha.slice(0, 7)}` : 'roblox-agency · root'}
                  </span>
                  <div className="spacer" />
                  <span className="t-mono t-xs t-muted">
                    {rootLoading ? 'loading…' : `${sortedRoot.length} top-level entries`}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {sortedRoot.map(entry => (
                    <MapTile
                      key={entry.path}
                      entry={entry}
                      games={entry.name === 'games' ? gameSlugs : undefined}
                      onFileClick={handleFileClick}
                    />
                  ))}
                </div>

                <div className="row gap-16" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
                  <KbdHint k="⌘K" l="Search files" />
                  <KbdHint k="esc" l="Close panel" />
                  <div className="spacer" />
                  {currentBranch && (
                    <span className="t-mono t-xs t-muted">
                      {currentBranch.last_commit_message.slice(0, 50)}
                    </span>
                  )}
                </div>
              </div>

              {/* Recently changed + branches */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <section className="card fade-up d-2">
                  <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: 14 }}>Recently changed</h3>
                    <div className="spacer" />
                    <span className="t-mono t-xs t-muted">git log</span>
                  </div>
                  <div>
                    {recentFiles.length === 0
                      ? <div className="t-muted t-sm" style={{ padding: '14px 18px' }}>No recent changes.</div>
                      : recentFiles.map((f, i) => (
                        <div
                          key={f.path}
                          className="row gap-10 card-hover"
                          onClick={() => handleFileClick(f.path)}
                          style={{ padding: '9px 18px', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                        >
                          <FileIcon size={13} color={fileColor(f.path.split('/').pop() ?? '')} />
                          <span className="t-mono t-xs flex-1" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.path}
                          </span>
                          <span className="t-xs t-muted" style={{ flexShrink: 0 }}>
                            {f.author.split(' ')[0]}
                          </span>
                          <span className="t-mono t-xs t-muted" style={{ minWidth: 52, textAlign: 'right', flexShrink: 0 }}>
                            {relTime(f.date)}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </section>

                <section className="card fade-up d-3">
                  <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: 14 }}>Branches · {branches.length}</h3>
                    <div className="spacer" />
                    <span className="t-mono t-xs t-muted">local</span>
                  </div>
                  <div>
                    {branches.length === 0
                      ? <div className="t-muted t-sm" style={{ padding: '14px 18px' }}>Loading…</div>
                      : branches.map((b, i) => (
                        <div
                          key={b.name}
                          className="row gap-10"
                          style={{ padding: '10px 18px', borderTop: i ? '1px solid var(--border)' : 'none' }}
                        >
                          <BranchIcon size={13} color={b.is_current ? 'var(--accent)' : 'var(--muted)'} />
                          <span
                            className="t-mono t-xs flex-1"
                            style={{ color: b.is_current ? 'var(--ink)' : 'var(--ink-dim)', fontWeight: b.is_current ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {b.name}
                          </span>
                          {b.is_current && <span className="chip chip-accent">current</span>}
                          <span className="t-mono t-xs t-muted">{b.last_commit_sha.slice(0, 7)}</span>
                        </div>
                      ))
                    }
                  </div>
                </section>
              </div>
            </>
          )}

          {/* ── Tree view ── */}
          {view === 'tree' && (
            <div className="card fade-up d-1" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <span className="text-cap">File tree</span>
                <div className="spacer" />
                <span className="t-mono t-xs t-muted">click to open</span>
              </div>
              <div style={{ padding: '8px 6px', overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
                {rootLoading
                  ? <div className="t-muted t-sm" style={{ padding: 16 }}>Loading…</div>
                  : sortedRoot.map(entry => (
                    <TreeNode
                      key={entry.path}
                      entry={entry}
                      depth={0}
                      onFileClick={handleFileClick}
                      selectedFile={selectedFile}
                    />
                  ))
                }
              </div>
            </div>
          )}

          {/* ── Graph view ── */}
          {view === 'graph' && (
            <div className="fade-up d-1">
              <GraphView onFileClick={handleFileClick} />
            </div>
          )}
        </div>

        {/* File panel */}
        {selectedFile && (
          <FilePanel
            path={selectedFile}
            onClose={() => setSelectedFile(null)}
          />
        )}
      </div>

      {/* Palette */}
      {paletteOpen && (
        <Palette
          onClose={() => setPaletteOpen(false)}
          onOpen={handleFileClick}
        />
      )}

      {/* Branch menu backdrop */}
      {branchMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setBranchMenuOpen(false)}
        />
      )}
    </div>
  )
}
