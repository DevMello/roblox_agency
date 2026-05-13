import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { useWebSocket } from '../../hooks/useWebSocket'

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  // Initialize WebSocket connection
  useWebSocket()

  return (
    <div className="flex h-screen bg-bg text-text-primary overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
