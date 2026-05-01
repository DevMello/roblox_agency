import { useState, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'

// ── types ─────────────────────────────────────────────────────────────────────

type Genre = 'Obby' | 'Simulator' | 'Tycoon' | 'RPG' | 'FPS' | 'Other'
const GENRES: Genre[] = ['Obby', 'Simulator', 'Tycoon', 'RPG', 'FPS', 'Other']

// ── helpers ───────────────────────────────────────────────────────────────────

const API = '/api/v1'

function toSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .slice(0, 3)
    .join('-')
    .replace(/-+/g, '-')
}

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `${options?.method ?? 'GET'} ${url} → ${res.status}`)
  }
  return res
}

// Minimal markdown → HTML renderer (headings, code blocks, paragraphs)
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 style="color:#7C6FFF;font-family:Syne,sans-serif;margin:12px 0 6px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#F0EEF8;font-family:Syne,sans-serif;margin:16px 0 8px;font-size:16px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:#F0EEF8;font-family:Syne,sans-serif;margin:20px 0 10px;font-size:20px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#1E1E2E;color:#7C6FFF;padding:1px 5px;border-radius:3px;font-family:JetBrains Mono,monospace;font-size:12px">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin:3px 0">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>)/g, '<ul style="margin:6px 0 6px 16px;padding:0">$1</ul>')
    .split('\n\n')
    .map(block => {
      if (block.match(/^<[hul]/)) return block
      if (block.trim() === '') return ''
      return `<p style="margin:0 0 10px;line-height:1.65;color:#F0EEF8">${block.replace(/\n/g, '<br/>')}</p>`
    })
    .join('\n')
}

// ── main component ────────────────────────────────────────────────────────────

export default function Prompt() {
  const navigate = useNavigate()
  const [idea, setIdea] = useState('')
  const [slug, setSlug] = useState('')
  const [genre, setGenre] = useState<Genre>('Simulator')
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState('')
  const [streamDone, setStreamDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const handleIdeaBlur = () => {
    if (idea.trim() && !slug) {
      setSlug(toSlug(idea))
    }
  }

  const generate = useCallback(async () => {
    if (!idea.trim()) {
      setError('Please describe your game idea first.')
      return
    }
    if (!slug.trim()) {
      setError('Please provide a game slug.')
      return
    }
    setError(null)
    setPreview('')
    setStreamDone(false)
    setGenerating(true)

    // Cancel previous stream if any
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API}/specs/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim(), slug: slug.trim(), genre }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || `Generate failed: ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n')
        buf = parts.pop() ?? ''
        for (const line of parts) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const jsonStr = trimmed.slice(5).trim()
          try {
            const evt = JSON.parse(jsonStr) as { chunk?: string; done?: boolean }
            if (evt.done) {
              setStreamDone(true)
              setGenerating(false)
              return
            }
            if (evt.chunk) {
              setPreview(prev => prev + evt.chunk)
              // scroll preview to bottom
              if (previewRef.current) {
                previewRef.current.scrollTop = previewRef.current.scrollHeight
              }
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
      setStreamDone(true)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [idea, slug, genre])

  const saveAndRun = async () => {
    if (!preview.trim()) {
      setError('Generate a spec first.')
      return
    }
    if (!slug.trim()) {
      setError('Slug is required.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      // Save spec
      await apiFetch(`${API}/specs/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: preview }),
      })
      // Launch architect
      const res = await apiFetch(`${API}/runs/architect/${slug}`, { method: 'POST' })
      await res.json()
      navigate(`/projects/${slug}/run`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const content = ev.target?.result as string
      setPreview(content)
      setStreamDone(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: '#0A0A0F', color: '#F0EEF8',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid #1E1E2E',
        backgroundColor: '#111118', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Link to="/projects" style={{ color: '#6E6C85', textDecoration: 'none' }}>← Projects</Link>
          <span style={{ color: '#1E1E2E' }}>/</span>
          <span style={{ color: '#F0EEF8', fontWeight: 600 }}>New Game</span>
        </div>
        {/* Import fallback */}
        <label style={{
          fontSize: 12, color: '#6E6C85', cursor: 'pointer',
          padding: '5px 12px', border: '1px solid #1E1E2E',
          borderRadius: 6, fontFamily: 'JetBrains Mono, monospace',
          transition: 'color 0.15s',
        }}>
          Import spec.md
          <input type="file" accept=".md,.txt" onChange={importFile} style={{ display: 'none' }} />
        </label>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          padding: '10px 24px', backgroundColor: 'rgba(255,74,110,0.1)',
          borderBottom: '1px solid rgba(255,74,110,0.2)',
          color: '#FF4A6E', fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
          flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* ── Split view ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: form */}
        <div style={{
          width: 380, flexShrink: 0, padding: '24px 20px',
          borderRight: '1px solid #1E1E2E', overflow: 'auto',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontFamily: 'Syne, sans-serif', fontWeight: 700, margin: '0 0 4px' }}>
              New Game
            </h1>
            <p style={{ color: '#6E6C85', fontSize: 13, margin: 0 }}>
              Describe your idea and we'll generate a full spec.
            </p>
          </div>

          {/* Idea textarea */}
          <div>
            <label style={labelStyle}>What's your game idea?</label>
            <textarea
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="A multiplayer tycoon where players build factories and automate production lines to dominate the economy..."
              rows={5}
              style={{
                ...inputBase,
                resize: 'vertical', fontFamily: 'DM Sans, sans-serif',
                lineHeight: 1.6, width: '100%',
              }}
              onFocus={focusStyle}
              onBlur={e => { handleIdeaBlur(); blurStyle(e) }}
            />
          </div>

          {/* Slug */}
          <div>
            <label style={labelStyle}>Game slug</label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="e.g. factory-tycoon"
              style={{ ...inputBase, width: '100%', fontFamily: 'JetBrains Mono, monospace' }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
            <div style={{ fontSize: 11, color: '#6E6C85', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
              Used as folder name and branch slug
            </div>
          </div>

          {/* Genre */}
          <div>
            <label style={labelStyle}>Genre</label>
            <select
              value={genre}
              onChange={e => setGenre(e.target.value as Genre)}
              style={{
                ...inputBase, width: '100%', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            >
              {GENRES.map(g => (
                <option key={g} value={g} style={{ backgroundColor: '#111118' }}>{g}</option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <button
            onClick={() => void generate()}
            disabled={generating || !idea.trim()}
            style={{
              padding: '12px 0', width: '100%',
              backgroundColor: generating || !idea.trim()
                ? 'rgba(124,111,255,0.08)'
                : 'rgba(124,111,255,0.2)',
              color: generating || !idea.trim() ? '#6E6C85' : '#7C6FFF',
              border: '1px solid rgba(124,111,255,0.3)',
              borderRadius: 8, fontSize: 15, fontWeight: 700,
              cursor: generating || !idea.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'Syne, sans-serif', transition: 'background 0.15s',
            }}
          >
            {generating ? 'Generating...' : 'Generate Spec →'}
          </button>

          {/* Save & Run */}
          {(streamDone || preview) && (
            <button
              onClick={() => void saveAndRun()}
              disabled={saving || !preview.trim()}
              style={{
                padding: '12px 0', width: '100%',
                backgroundColor: saving ? 'rgba(0,229,160,0.08)' : 'rgba(0,229,160,0.15)',
                color: saving ? '#6E6C85' : '#00E5A0',
                border: '1px solid rgba(0,229,160,0.25)',
                borderRadius: 8, fontSize: 15, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'Syne, sans-serif', transition: 'background 0.15s',
              }}
            >
              {saving ? 'Saving...' : 'Save & Run Architect'}
            </button>
          )}
        </div>

        {/* Right: streaming preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid #1E1E2E',
            backgroundColor: '#111118', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 11, color: '#6E6C85', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Spec Preview
            </span>
            {generating && (
              <span style={{ fontSize: 10, color: '#7C6FFF', fontFamily: 'JetBrains Mono, monospace', animation: 'blink 1s step-end infinite' }}>
                <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
                streaming...
              </span>
            )}
            {streamDone && !generating && preview && (
              <span style={{ fontSize: 10, color: '#00E5A0', fontFamily: 'JetBrains Mono, monospace' }}>done</span>
            )}
          </div>
          <div
            ref={previewRef}
            style={{
              flex: 1, overflow: 'auto', padding: '20px 24px',
              backgroundColor: '#0A0A0F',
            }}
          >
            {!preview ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', color: '#6E6C85', fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace', flexDirection: 'column', gap: 8,
              }}>
                <span style={{ fontSize: 28 }}>✦</span>
                <span>Spec will appear here as it streams</span>
              </div>
            ) : (
              <div
                style={{ fontSize: 13, lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(preview) }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── style helpers (no extra components) ──────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 6, fontSize: 11,
  color: '#6E6C85', fontFamily: 'JetBrains Mono, monospace',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

const inputBase: React.CSSProperties = {
  padding: '8px 12px', backgroundColor: '#0A0A0F',
  border: '1px solid #1E1E2E', borderRadius: 6,
  color: '#F0EEF8', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', display: 'block',
}

function focusStyle(e: React.FocusEvent<HTMLElement>) {
  ;(e.target as HTMLElement).style.borderColor = '#7C6FFF'
}

function blurStyle(e: React.FocusEvent<HTMLElement>) {
  ;(e.target as HTMLElement).style.borderColor = '#1E1E2E'
}
