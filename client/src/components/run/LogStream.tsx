import { useEffect, useRef } from 'react'

interface LogStreamProps {
  logs: string[]
  autoScroll?: boolean
  height?: string
  className?: string
}

function stripAnsi(line: string): string {
  return line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
}

function lineColor(line: string): string {
  const lower = line.toLowerCase()
  if (/error|err\b|exception|fatal/.test(lower)) return 'text-danger'
  if (/warn(?:ing)?/.test(lower)) return 'text-warning'
  if (/success|done|completed|ok\b/.test(lower)) return 'text-success'
  return 'text-text-primary'
}

export function LogStream({ logs, autoScroll = true, height = '400px', className }: LogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  return (
    <div
      className={`font-mono text-xs bg-bg border border-border rounded overflow-auto${className ? ` ${className}` : ''}`}
      style={{ height }}
    >
      <div className="p-3 space-y-0.5">
        {logs.map((raw, i) => {
          const line = stripAnsi(raw)
          return (
            <div key={i} className={`whitespace-pre-wrap break-all ${lineColor(line)}`}>
              {line}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
