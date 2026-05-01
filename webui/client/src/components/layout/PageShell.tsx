// Stub — full implementation provided by frontend-design-layout worker
import { type ReactNode } from 'react'

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-bg text-text-primary overflow-hidden">
      <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-4 border-b border-border">
          <span className="font-display font-bold text-accent text-lg tracking-wide">AGENCY</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 text-sm text-text-muted font-body">
          {[
            ['Projects', '/projects'],
            ['Schedule', '/schedule'],
            ['Repo', '/repo'],
            ['Config', '/config'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-border hover:text-text-primary transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
