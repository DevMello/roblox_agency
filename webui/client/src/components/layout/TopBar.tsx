import { Fragment, type ReactNode } from 'react'
import { clsx } from 'clsx'

export interface RunState {
  idle: boolean
  label: string
}

interface TopBarProps {
  crumbs: string[]
  runState?: RunState
  right?: ReactNode
}

export function TopBar({ crumbs, runState, right }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="crumbs">
        <span className="crumb root">snapblox</span>
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            <span className="sep">/</span>
            <span className={clsx('crumb', i === crumbs.length - 1 && 'last')}>{c}</span>
          </Fragment>
        ))}
      </div>
      <div className="spacer" />
      {runState && (
        <div className={clsx('run-pill', runState.idle && 'idle')}>
          <span className="dot" />
          <span>{runState.label}</span>
        </div>
      )}
      {right}
    </header>
  )
}
