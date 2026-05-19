import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar, type RunState } from './TopBar'
import { useWebSocket } from '../../hooks/useWebSocket'

interface PageShellProps {
  crumbs?: string[]
  runState?: RunState
  topRight?: ReactNode
  children: ReactNode
}

export function PageShell({ crumbs = [], runState, topRight, children }: PageShellProps) {
  useWebSocket()

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <TopBar crumbs={crumbs} runState={runState} right={topRight} />
        <main className="page">{children}</main>
      </div>
    </div>
  )
}
