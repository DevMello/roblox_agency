import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { Run, Task, TaskStatus, Game } from '../types'

// ── helpers ──────────────────────────────────────────────────────────────────

const API = '/api/v1'

async function apiPost<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}`)
  return res.json() as Promise<T>
}

async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${url} → ${res.status}`)
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.json() as Promise<T>
}

function statusColor(status: string): string {
  switch (status) {
    case 'done':      return '#00E5A0'
    case 'running':   return '#7C6FFF'
    case 'failed':    return '#FF4A6E'
    case 'blocked':   return '#FFB547'
    default:          return '#6E6C85'
  }
}

function StatusBadge({ status }: { status: string }) {
  const isPulsing = status === 'running'
  const dotColor = statusColor(status)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block',
          animation: isPulsing ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
      <span style={{ color: dotColor, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {status}
      </span>
    </span>
  )
}

function TaskRow({ task }: { task: Task }) {
  const dot = statusColor(task.status)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 12px', borderBottom: '1px solid #1E1E2E',
      fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        backgroundColor: dot, flexShrink: 0,
        boxShadow: task.status === 'running' ? `0 0 6px ${dot}` : 'none',
      }} />
      <span style={{ color: '#6E6C85', width: 80, flexShrink: 0 }}>{task.id}</span>
      <span style={{ color: '#F0EEF8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title}
      </span>
      <span style={{ color: '#6E6C85', width: 60, textAlign: 'right' }}>{task.agent}</span>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function LiveRun() {
  const { game } = useParams<{ game: string }>()
  const [runId, setRunId] = useState<string | null>(null)
  const [run, setRun] = useState<Run | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState<string | null>(null)
  const [launching, setLaunching] = useState<'night-cycle' | 'architect' | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-scroll to bottom on new log lines
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  // Poll run status + logs
  const pollRun = useCallback(async (id: string) => {
    try {
      const [runData, logsData] = await Promise.all([
        apiGet<Run>(`${API}/runs/${id}`),
        apiGet<{ lines: string[] }>(`${API}/runs/${id}/logs?n=500`),
      ])
      setRun(runData)
      setLogs(logsData.lines ?? [])
    } catch {
      // silently ignore transient errors during polling
    }
  }, [])

  // Fetch game state for tasks
  const fetchGame = useCallback(async () => {
    if (!game) return
    try {
      const data = await apiGet<Game & { tasks?: Task[] }>(`${API}/games/${game}`)
      if (Array.isArray((data as { tasks?: Task[] }).tasks)) {
        setTasks((data as { tasks?: Task[] }).tasks ?? [])
      }
    } catch {
      // game tasks are best-effort
    }
  }, [game])

  // Start polling when runId is known
  useEffect(() => {
    if (!runId) return
    // immediate first fetch
    void pollRun(runId)
    void fetchGame()
    pollingRef.current = setInterval(() => {
      void pollRun(runId)
    }, 2000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [runId, pollRun, fetchGame])

  // Stop polling when run finishes
  useEffect(() => {
    if (run && run.status !== 'running' && run.status !== 'pending') {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [run])

  const launch = async (script: 'night-cycle' | 'architect') => {
    setError(null)
    setLaunching(script)
    try {
      const endpoint = `${API}/runs/${script}/${game}`
      const result = await apiPost<{ run_id: string }>(endpoint)
      setRunId(result.run_id)
      setLogs([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Launch failed')
    } finally {
      setLaunching(null)
    }
  }

  const kill = async () => {
    if (!runId) return
    try {
      await apiDelete(`${API}/runs/${runId}`)
      setRun((prev) => prev ? { ...prev, status: 'killed' } : prev)
      if (pollingRef.current) clearInterval(pollingRef.current)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kill failed')
    }
  }

  const isAlive = run?.status === 'running' || run?.status === 'pending'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0A0A0F', color: '#F0EEF8' }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid #1E1E2E',
        backgroundColor: '#111118', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
          <Link to="/projects" style={{ color: '#6E6C85', textDecoration: 'none' }}>Projects</Link>
          <span style={{ color: '#1E1E2E' }}>/</span>
          <Link to={`/projects/${game}`} style={{ color: '#6E6C85', textDecoration: 'none' }}>{game}</Link>
          <span style={{ color: '#1E1E2E' }}>/</span>
          <span style={{ color: '#F0EEF8', fontWeight: 600 }}>Run</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {run && <StatusBadge status={run.status} />}
          {runId && isAlive && (
            <button
              onClick={() => void kill()}
              style={{
                padding: '6px 14px', backgroundColor: 'rgba(255,74,110,0.15)',
                color: '#FF4A6E', border: '1px solid rgba(255,74,110,0.3)',
                borderRadius: 6, fontSize: 12, cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
              }}
            >
              Kill
            </button>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          padding: '10px 24px', backgroundColor: 'rgba(255,74,110,0.1)',
          borderBottom: '1px solid rgba(255,74,110,0.2)', color: '#FF4A6E',
          fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Left: Launch panel or log stream ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!runId ? (
            /* Launch panel */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 24,
            }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 6 }}>
                  Launch a run for <span style={{ color: '#7C6FFF' }}>{game}</span>
                </div>
                <div style={{ color: '#6E6C85', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                  No active run. Choose a script to start.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <button
                  onClick={() => void launch('night-cycle')}
                  disabled={launching !== null}
                  style={{
                    padding: '12px 28px',
                    backgroundColor: launching === 'night-cycle' ? 'rgba(124,111,255,0.3)' : 'rgba(124,111,255,0.15)',
                    color: '#7C6FFF', border: '1px solid rgba(124,111,255,0.3)',
                    borderRadius: 8, fontSize: 14, cursor: launching ? 'not-allowed' : 'pointer',
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    transition: 'background 0.15s',
                  }}
                >
                  {launching === 'night-cycle' ? 'Launching...' : 'Night Cycle'}
                </button>
                <button
                  onClick={() => void launch('architect')}
                  disabled={launching !== null}
                  style={{
                    padding: '12px 28px',
                    backgroundColor: launching === 'architect' ? 'rgba(0,229,160,0.2)' : 'rgba(0,229,160,0.1)',
                    color: '#00E5A0', border: '1px solid rgba(0,229,160,0.2)',
                    borderRadius: 8, fontSize: 14, cursor: launching ? 'not-allowed' : 'pointer',
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    transition: 'background 0.15s',
                  }}
                >
                  {launching === 'architect' ? 'Launching...' : 'Architect'}
                </button>
              </div>
            </div>
          ) : (
            /* Log stream */
            <div
              ref={logRef}
              style={{
                flex: 1, overflow: 'auto', padding: '12px 16px',
                backgroundColor: '#0A0A0F',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                lineHeight: '1.6',
              }}
            >
              {logs.length === 0 ? (
                <span style={{ color: '#6E6C85' }}>Waiting for output...</span>
              ) : (
                logs.map((line, i) => (
                  <div key={i} style={{ color: '#F0EEF8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {line}
                  </div>
                ))
              )}
              {isAlive && (
                <span style={{ color: '#7C6FFF', animation: 'blink 1s step-end infinite' }}>
                  <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>▮
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Task board ── */}
        {tasks.length > 0 && (
          <div style={{
            width: 320, flexShrink: 0, borderLeft: '1px solid #1E1E2E',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            backgroundColor: '#111118',
          }}>
            <div style={{
              padding: '10px 12px', borderBottom: '1px solid #1E1E2E',
              fontSize: 11, color: '#6E6C85', fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Tasks — {tasks.filter(t => t.status === 'done').length}/{tasks.length} done
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {tasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
            {/* Status summary */}
            <div style={{
              padding: '8px 12px', borderTop: '1px solid #1E1E2E',
              display: 'flex', gap: 12, flexWrap: 'wrap',
            }}>
              {(['pending', 'running', 'done', 'failed', 'blocked'] as TaskStatus[]).map(s => {
                const count = tasks.filter(t => t.status === s).length
                if (count === 0) return null
                return (
                  <span key={s} style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: statusColor(s) }}>
                    {count} {s}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
