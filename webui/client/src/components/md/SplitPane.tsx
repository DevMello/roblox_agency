// Stub — full implementation provided by frontend-markdown worker
import { type ReactNode } from 'react'

export function SplitPane({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex h-full">
      <div className="flex-1 border-r border-border overflow-auto">{left}</div>
      <div className="flex-1 overflow-auto">{right}</div>
    </div>
  )
}
