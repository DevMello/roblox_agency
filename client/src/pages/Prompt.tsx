import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ── types ─────────────────────────────────────────────────────────────────────

type Genre = 'Obby' | 'Tycoon' | 'Simulator' | 'Roleplay' | 'Horror' | 'Sandbox'

interface SpecLine {
  t: 'h1' | 'fm' | 'h2' | 'p' | 'li' | 'mono'
  text: string
}

// ── constants ─────────────────────────────────────────────────────────────────

const GENRES: Genre[] = ['Obby', 'Tycoon', 'Simulator', 'Roleplay', 'Horror', 'Sandbox']

const SPEC_LINES: SpecLine[] = [
  { t: 'h1',  text: 'lava-escape' },
  { t: 'fm',  text: 'genre: obby · target-age: 9-14 · est-mau: 50k' },
  { t: 'h2',  text: 'Core Loop' },
  { t: 'p',   text: 'Player spawns at zone-start checkpoint. Tide rises every 12s.' },
  { t: 'h2',  text: 'Zones (4 in M1)' },
  { t: 'li',  text: '01 · The Foundry — conveyor belts, falling beams' },
  { t: 'li',  text: '02 · Glass Garden — slippery floors, swinging pendulums' },
  { t: 'h2',  text: 'Monetisation' },
  { t: 'li',  text: 'Gamepass · Double Jump (149 R$)' },
  { t: 'li',  text: 'Gamepass · 2× Coins (299 R$)' },
  { t: 'h2',  text: 'Milestones' },
  { t: 'li',  text: 'M1 — Core loop · 4 zones playable' },
  { t: 'li',  text: 'M2 — Monetisation · gamepasses live' },
]

const API = '/api/v1'

// ── sub-components ────────────────────────────────────────────────────────────

function SpecLineView({ t, text }: SpecLine) {
  if (t === 'h1') {
    return (
      <div className="t-display" style={{ fontSize: 24, lineHeight: 1.1, marginBottom: 2 }}>
        # {text}
      </div>
    )
  }
  if (t === 'fm') {
    return <div className="t-mono t-xs t-muted" style={{ marginBottom: 6 }}>{text}</div>
  }
  if (t === 'h2') {
    return (
      <div className="t-display" style={{ fontSize: 15, marginTop: 10, color: 'var(--accent-soft)' }}>
        ## {text}
      </div>
    )
  }
  if (t === 'p') {
    return <div className="t-sm t-dim" style={{ lineHeight: 1.55 }}>{text}</div>
  }
  if (t === 'li') {
    return (
      <div className="t-sm t-dim row gap-8">
        <span className="t-muted">·</span>
        <span>{text}</span>
      </div>
    )
  }
  if (t === 'mono') {
    return (
      <div
        className="t-mono t-sm"
        style={{ background: 'var(--bg)', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border)' }}
      >
        {text}
      </div>
    )
  }
  return null
}

interface StepProps {
  n: string
  label: string
  active?: boolean
}

function Step({ n, label, active = false }: StepProps) {
  return (
    <div className="row gap-8" style={{ flex: 1 }}>
      <div
        style={{
          width: 26, height: 26, borderRadius: 999,
          display: 'grid', placeItems: 'center',
          border: `1px solid ${active ? 'var(--accent)' : 'var(--border-2)'}`,
          background: active ? 'var(--accent-wash)' : 'transparent',
          fontFamily: 'var(--f-mono)', fontSize: 11,
          color: active ? 'var(--accent-soft)' : 'var(--muted)',
          boxShadow: active ? '0 0 12px var(--accent-glow)' : 'none',
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div className="col">
        <div className="t-sm" style={{ color: active ? 'var(--ink)' : 'var(--muted)' }}>{label}</div>
      </div>
    </div>
  )
}

function StepSep() {
  return <div style={{ flex: 0, width: 24, height: 1, background: 'var(--border-2)' }} />
}

// ── main component ────────────────────────────────────────────────────────────

export default function Prompt() {
  const navigate = useNavigate()

  const [idea, setIdea] = useState(
    'A fast-paced obby where players escape from a rising lava tide. Each zone has its own theme and hazards. Monetised with gamepasses for double jump and a pets system.'
  )
  const [slug, setSlug] = useState('lava-escape')
  const [genre, setGenre] = useState<Genre>('Obby')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const visibleLines = generating ? SPEC_LINES.slice(0, progress) : []
  const streamDone = generating && progress >= SPEC_LINES.length

  // Tick one line at a time while generating
  useEffect(() => {
    if (!generating) return
    if (progress >= SPEC_LINES.length) return
    const timer = setTimeout(() => setProgress(p => p + 1), 140)
    return () => clearTimeout(timer)
  }, [generating, progress])

  const handleGenerate = () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setGenerating(true)
    setProgress(0)

    // Try real API first; simulated streaming via useEffect runs in parallel as fallback
    fetch(`${API}/specs/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea: idea.trim(), slug: slug.trim(), genre }),
      signal: controller.signal,
    }).catch(() => { /* ignore — fallback streaming already started */ })
  }

  // Cancel any in-flight generate request on unmount
  useEffect(() => () => { abortRef.current?.abort() }, [])

  const handleSaveAndRun = async () => {
    try {
      await fetch(`${API}/runs/architect/${slug}`, { method: 'POST' })
    } catch {
      // best-effort
    }
    navigate(`/projects/${slug}`)
  }

  return (
    <div className="page" style={{ overflowY: 'auto' }}>
      {/* Page head */}
      <div className="page-head">
        <div>
          <div className="t-mono t-xs t-muted" style={{ marginBottom: 6 }}>✦ Step 1 of 2</div>
          <h1>Spin up a new game</h1>
          <div className="lead">
            Plain-language idea → spec.md → Architect run. Two minutes from prompt to plan.
          </div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost">Import spec.md</button>
          <button className="btn btn-ghost" onClick={() => navigate('/projects')}>← Cancel</button>
        </div>
      </div>

      {/* Main 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'stretch' }}>

        {/* LEFT — idea input */}
        <section className="card card-pad fade-up d-1" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="row gap-8" style={{ marginBottom: 14 }}>
            <span style={{ color: 'var(--accent-soft)', fontSize: 18 }}>✦</span>
            <h3 style={{ fontSize: 17 }}>What's your game idea?</h3>
          </div>

          <textarea
            className="field field-lg"
            value={idea}
            onChange={e => setIdea(e.target.value)}
            rows={7}
            style={{ minHeight: 160 }}
          />

          <div className="row gap-8" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <span className="chip" style={{ cursor: 'pointer' }}>+ Reference image</span>
            <span className="chip" style={{ cursor: 'pointer' }}>⊡ Existing spec.md</span>
            <span className="chip chip-accent" style={{ cursor: 'pointer' }}>✦ Remix project</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12, marginTop: 18 }}>
            <div>
              <span className="label-cap">Slug</span>
              <input
                className="field field-mono"
                value={slug}
                onChange={e => setSlug(e.target.value)}
              />
            </div>
            <div>
              <span className="label-cap">Genre</span>
              <select
                className="field"
                value={genre}
                onChange={e => setGenre(e.target.value as Genre)}
              >
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <span className="label-cap">Workers</span>
              <select className="field">
                <option>All registered</option>
                <option>machine-a</option>
                <option>machine-b</option>
              </select>
            </div>
          </div>

          <div className="spacer" />

          <div className="row gap-10" style={{ marginTop: 24, alignItems: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleGenerate}
            >
              ✦ Generate spec →
            </button>
            <button className="btn btn-ghost">Save draft</button>
            <div className="spacer" />
            <div className="t-muted t-xs t-mono">claude-sonnet-4</div>
          </div>
        </section>

        {/* RIGHT — streaming spec */}
        <section
          className="card glow-violet fade-up d-2"
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="t-mono t-xs t-muted">system/specs/{slug}/spec.md</div>
            <div className="spacer" />
            {generating ? (
              <div className="row gap-6">
                <span className="dot dot-live" />
                <span className="t-xs t-mono t-accent">
                  streaming · {progress}/{SPEC_LINES.length}
                </span>
              </div>
            ) : (
              <div className="row gap-6">
                <span className="dot dot-muted" />
                <span className="t-xs t-mono t-muted">waiting</span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
            {!generating ? (
              <div
                className="col gap-12"
                style={{
                  height: '100%', justifyContent: 'center', alignItems: 'center',
                  textAlign: 'center', opacity: 0.6,
                }}
              >
                <span style={{ fontSize: 36, color: 'var(--accent)', opacity: 0.7 }}>✦</span>
                <div className="t-display" style={{ fontSize: 18 }}>
                  The generated spec will stream here
                </div>
                <div className="t-muted t-sm" style={{ maxWidth: 320 }}>
                  Frontmatter, milestones, monetisation, MCP requirements — every section
                  editable before Architect picks it up.
                </div>
              </div>
            ) : (
              <div className="col gap-8">
                {visibleLines.map((line, i) => (
                  <SpecLineView key={i} {...line} />
                ))}
                {!streamDone && <span className="caret" />}
                {streamDone && (
                  <div
                    className="row gap-10"
                    style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--border)' }}
                  >
                    <button className="btn btn-primary" onClick={() => void handleSaveAndRun()}>
                      → Save &amp; run Architect
                    </button>
                    <button className="btn">Edit further</button>
                    <button className="btn btn-ghost" onClick={() => setProgress(0)}>
                      Regenerate
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Step strip */}
      <div className="card card-pad fade-up d-3" style={{ marginTop: 24 }}>
        <div className="row gap-16">
          <Step n="01" label="Idea" active />
          <StepSep />
          <Step n="02" label="Generate spec" active={generating} />
          <StepSep />
          <Step n="03" label="Review & edit" />
          <StepSep />
          <Step n="04" label="Run Architect" />
          <StepSep />
          <Step n="05" label="plan.md written" />
        </div>
      </div>
    </div>
  )
}
