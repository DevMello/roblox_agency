import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface TopBarProps {
  title: string
  breadcrumb?: BreadcrumbItem[]
  actions?: ReactNode
}

export function TopBar({ title, breadcrumb, actions }: TopBarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-surface shrink-0">
      {/* Left: breadcrumb + title */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <>
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-2 text-sm text-text-muted">
                {item.href ? (
                  <Link
                    to={item.href}
                    className="hover:text-text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
                <span className="text-border select-none">/</span>
              </span>
            ))}
          </>
        )}
        <h1 className="text-sm font-semibold font-display text-text-primary truncate">
          {title}
        </h1>
      </div>

      {/* Right: actions */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {actions}
        </div>
      )}
    </header>
  )
}
