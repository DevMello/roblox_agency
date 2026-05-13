interface TimelineEvent {
  agent: string
  action: string
  timestamp: string
  run_id?: string
}

interface AgentTimelineProps {
  events: TimelineEvent[]
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ts
  }
}

export function AgentTimeline({ events }: AgentTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-text-muted text-xs font-mono px-2 py-4">No events yet.</div>
    )
  }

  return (
    <div className="relative space-y-0">
      {events.map((ev, i) => {
        const isLast = i === events.length - 1
        return (
          <div key={i} className="flex gap-3 relative">
            {/* dot + connecting line */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 16 }}>
              <div className="w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-accent/20 flex-shrink-0 mt-1" />
              {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
            </div>

            {/* content */}
            <div className={`pb-4 min-w-0 flex-1${isLast ? '' : ''}`}>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-accent text-xs font-mono font-semibold">{ev.agent}</span>
                <span className="text-text-muted text-[10px] font-mono">{formatTime(ev.timestamp)}</span>
                {ev.run_id && (
                  <span className="text-text-muted text-[10px] font-mono opacity-60">{ev.run_id}</span>
                )}
              </div>
              <div className="text-text-primary text-xs mt-0.5 leading-snug">{ev.action}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
