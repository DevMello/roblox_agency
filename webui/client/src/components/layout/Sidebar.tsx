import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { useWsStore } from '../../store/wsStore'
import { ROUTES } from '../../router'

const NAV_ITEMS = [
  {
    label: 'Projects',
    href: ROUTES.projects,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
        <path d="M2 2h5v5H2V2zm0 7h5v5H2V9zm7-7h5v5H9V2zm0 7h5v5H9V9z" />
      </svg>
    ),
  },
  {
    label: 'New',
    href: ROUTES.new,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
        <path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5V1.75A.75.75 0 0 1 8 1z" />
      </svg>
    ),
  },
  {
    label: 'Explorer',
    href: ROUTES.repo,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
        <path d="M1.5 1.75A.75.75 0 0 1 2.25 1h4a.75.75 0 0 1 .53.22l1.72 1.72H13a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75H2.25A.75.75 0 0 1 1.5 14V1.75z" />
      </svg>
    ),
  },
  {
    label: 'Schedule',
    href: ROUTES.schedule,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
        <path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0z" />
      </svg>
    ),
  },
  {
    label: 'Config',
    href: ROUTES.config,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 shrink-0">
        <path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.34.016.387.016.775 0 1.162-.01.193.039.292.088.34l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.103-.303c-.066-.019-.176-.011-.299.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.212.224l-.288 1.107c-.17.645-.715 1.195-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.744-.065-1.289-.615-1.458-1.26l-.288-1.107c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.364-1.891l.814-.806c.049-.048.098-.147.088-.34a6.214 6.214 0 0 1 0-1.162c.01-.193-.039-.292-.088-.34l-.814-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.103.303c.066.019.176.011.299-.071.214-.143.437-.272.668-.386.133-.066.194-.158.212-.224l.288-1.107C6.761.645 7.306.095 8.05.031A8.2 8.2 0 0 1 8 0zM5.5 8a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0z" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const [expanded, setExpanded] = useState(false)
  const connected = useWsStore((s: any) => s.connected)

  return (
    <aside
      className={clsx(
        'group flex flex-col h-full bg-surface border-r border-border transition-all duration-200 ease-in-out shrink-0 overflow-hidden',
        expanded ? 'w-48' : 'w-14',
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Brand */}
      <div className="flex items-center h-14 px-3 border-b border-border shrink-0">
        <span className="font-display font-bold text-accent text-base tracking-widest select-none w-8 shrink-0 text-center">
          A
        </span>
        {expanded && (
          <span className="ml-2 font-display font-bold text-accent text-sm tracking-widest whitespace-nowrap overflow-hidden">
            AGENCY
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 space-y-0.5 overflow-hidden">
        {NAV_ITEMS.map(({ label, href, icon }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 mx-1 rounded-md text-sm font-body transition-colors border-l-2',
                isActive
                  ? 'bg-accent/10 text-accent border-accent'
                  : 'text-text-muted border-transparent hover:bg-border hover:text-text-primary',
              )
            }
          >
            {icon}
            {expanded && (
              <span className="whitespace-nowrap overflow-hidden">{label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* WS status */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
        <span
          className={clsx(
            'w-2 h-2 rounded-full shrink-0',
            connected ? 'bg-success' : 'bg-danger',
          )}
        />
        {expanded && (
          <span className="text-xs text-text-muted whitespace-nowrap overflow-hidden">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        )}
      </div>
    </aside>
  )
}
