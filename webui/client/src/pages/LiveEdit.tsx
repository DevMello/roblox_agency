import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'

// ── types ─────────────────────────────────────────────────────────────────────

interface OverrideHistoryItem {
  id: string
  timestamp: string
  text: string
  target_file?: string
  apply_immediately: boolean
  status: 'active' | 'applied' | 'superseded'
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

function statusColor(status: string): string {
  switch (status) {
    case 'active':    return '#7C6FFF'
    case 'applied':   return '#00E5A0'
    case 'superseded': return '#6E6C85'
    default:          return '#6E6C85'
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ── main component ────────────────────────────────────────────────────────────

export default function LiveEdit() {
  const { game } = useParams<{ game: string }>()
  const [text, setText] = useState('')
  const [targetFile, setTargetFile] = useState('')
  const [applyImmediately, setApplyImmediately] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<OverrideHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load history
  useEffect(() => {
    if (!game) return
    setHistoryLoading(true)
    apiGet<{ history: OverrideHistoryItem[] }>(`${API}/edits/history/${game}`)
      .then(data => setHistory(data.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [game])

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Override text cannot be empty.')
      return
    }
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      await apiPost<{ ok: boolean }>(`${API}/edits/${game}`, {
        text: text.trim(),
        target_file: targetFile.trim() || undefined,
        apply_immediately: applyImmediately,
      })
      setSuccess('Override submitted successfully.')
      setText('')
      setTargetFile('')
      setApplyImmediately(false)
      // Refresh history
      const data = await apiGet<{ history: OverrideHistoryItem[] }>(`${API}/edits/history/${game}`)
      setHistory(data.history ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: '#0A0A0F', color: '#F0EEF8',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 24px', borderBottom: '1px solid #1E1E2E',
        backgroundColor: '#111118', flexShrink: 0,
      }}>
        <Link to="/projects" style={{ color: '#6E6C85', textDecoration: 'none', fontSize: 13 }}>Projects</Link>
        <span style={{ color: '#1E1E2E' }}>/</span>
        <Link to={`/projects/${game}`} style={{ color: '#6E6C85', textDecoration: 'none', fontSize: 13 }}>{game}</Link>
        <span style={{ color: '#1E1E2E' }}>/</span>
        <span style={{ color: '#F0EEF8', fontSize: 13, fontWeight: 600 }}>Live Edit</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <h1 style={{
          fontSize: 22, fontFamily: 'Syne, sans-serif', fontWeight: 700,
          marginBottom: 4, marginTop: 0,
        }}>
          Live Edit — <span style={{ color: '#7C6FFF' }}>{game}</span>
        </h1>
        <p style={{ color: '#6E6C85', fontSize: 13, marginBottom: 24, marginTop: 0 }}>
          Submit a human override. This appends to <code style={{ color: '#7C6FFF', fontFamily: 'JetBrains Mono, monospace' }}>memory/human-overrides.md</code>.
        </p>

        {/* ── Success banner ── */}
        {success && (
          <div style={{
            padding: '10px 16px', marginBottom: 16,
            backgroundColor: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.25)',
            borderRadius: 8, color: '#00E5A0', fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {success}
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div style={{
            padding: '10px 16px', marginBottom: 16,
            backgroundColor: 'rgba(255,74,110,0.1)', border: '1px solid rgba(255,74,110,0.25)',
            borderRadius: 8, color: '#FF4A6E', fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {error}
          </div>
        )}

        {/* ── Form ── */}
        <div style={{
          backgroundColor: '#111118', border: '1px solid #1E1E2E',
          borderRadius: 10, padding: 20, marginBottom: 32,
        }}>
          {/* Override text */}
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#6E6C85', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Override text *
          </label>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Describe the override... (Markdown supported)"
            rows={8}
            style={{
              width: '100%', padding: '10px 12px',
              backgroundColor: '#0A0A0F', border: '1px solid #1E1E2E',
              borderRadius: 6, color: '#F0EEF8', fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = '#7C6FFF' }}
            onBlur={e => { e.target.style.borderColor = '#1E1E2E' }}
          />

          {/* Target file */}
          <label style={{ display: 'block', marginTop: 16, marginBottom: 6, fontSize: 12, color: '#6E6C85', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Target file (optional)
          </label>
          <input
            type="text"
            value={targetFile}
            onChange={e => setTargetFile(e.target.value)}
            placeholder="e.g. games/my-game/src/shared/Config.lua"
            style={{
              width: '100%', padding: '8px 12px',
              backgroundColor: '#0A0A0F', border: '1px solid #1E1E2E',
              borderRadius: 6, color: '#F0EEF8', fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace', outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = '#7C6FFF' }}
            onBlur={e => { e.target.style.borderColor = '#1E1E2E' }}
          />

          {/* Apply immediately */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 16, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={applyImmediately}
              onChange={e => setApplyImmediately(e.target.checked)}
              style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#7C6FFF' }}
            />
            <span style={{ fontSize: 13, color: '#F0EEF8' }}>Apply immediately</span>
            <span style={{ fontSize: 12, color: '#6E6C85' }}>(triggers live-edit script now)</span>
          </label>

          {/* Submit */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || !text.trim()}
              style={{
                padding: '10px 24px',
                backgroundColor: submitting || !text.trim() ? 'rgba(124,111,255,0.1)' : 'rgba(124,111,255,0.2)',
                color: submitting || !text.trim() ? '#6E6C85' : '#7C6FFF',
                border: '1px solid rgba(124,111,255,0.3)',
                borderRadius: 8, fontSize: 14, fontWeight: 700,
                cursor: submitting || !text.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'Syne, sans-serif', transition: 'background 0.15s',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Override'}
            </button>
          </div>
        </div>

        {/* ── Override history ── */}
        <div>
          <h2 style={{ fontSize: 16, fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: 12, marginTop: 0 }}>
            Override History
          </h2>
          {historyLoading ? (
            <div style={{ color: '#6E6C85', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center',
              color: '#6E6C85', fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
              backgroundColor: '#111118', borderRadius: 8, border: '1px solid #1E1E2E',
            }}>
              No overrides yet for {game}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map(item => (
                <div key={item.id} style={{
                  backgroundColor: '#111118', border: '1px solid #1E1E2E',
                  borderRadius: 8, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                      color: statusColor(item.status), textTransform: 'uppercase',
                      border: `1px solid ${statusColor(item.status)}40`,
                      backgroundColor: `${statusColor(item.status)}15`,
                      padding: '2px 7px', borderRadius: 4,
                    }}>
                      {item.status}
                    </span>
                    <span style={{ fontSize: 12, color: '#6E6C85', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatDate(item.timestamp)}
                    </span>
                    {item.apply_immediately && (
                      <span style={{ fontSize: 10, color: '#FFB547', fontFamily: 'JetBrains Mono, monospace' }}>
                        immediate
                      </span>
                    )}
                    {item.target_file && (
                      <span style={{ fontSize: 11, color: '#7C6FFF', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
                        {item.target_file}
                      </span>
                    )}
                  </div>
                  <pre style={{
                    margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    fontSize: 12, color: '#F0EEF8', fontFamily: 'JetBrains Mono, monospace',
                    lineHeight: 1.6,
                  }}>
                    {item.text}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
