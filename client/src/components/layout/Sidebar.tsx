import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { useWsStore } from '../../store/wsStore'
import { useGames } from '../../hooks/useGames'
import { ROUTES } from '../../router'
import {
  Logo,
  PromptIcon,
  ProjectsIcon,
  RepoIcon,
  ScheduleIcon,
  ConfigIcon,
} from '../ui/Icons'

const NAV_ITEMS = [
  { id: 'new',      label: 'New game',  href: ROUTES.new,      Icon: PromptIcon },
  { id: 'projects', label: 'Projects',  href: ROUTES.projects, Icon: ProjectsIcon },
  { id: 'repo',     label: 'Repo',      href: ROUTES.repo,     Icon: RepoIcon },
  { id: 'schedule', label: 'Schedule',  href: ROUTES.schedule, Icon: ScheduleIcon },
  { id: 'config',   label: 'Config',    href: ROUTES.config,   Icon: ConfigIcon },
]

export function Sidebar() {
  const connected = useWsStore((s) => s.connected)
  const { data: games } = useGames()

  return (
    <aside className="sidebar">
      <NavLink to={ROUTES.projects} className="sidebar-brand">
        <Logo size={22} />
        <span>snapblox</span>
        <span
          className="chip"
          style={{ marginLeft: 6, fontSize: 9, padding: '0 6px', borderRadius: 4 }}
        >
          v0.4
        </span>
      </NavLink>

      <div className="sidebar-section">Workspace</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ id, label, href, Icon }) => (
          <NavLink
            key={id}
            to={href}
            className={({ isActive }) => clsx('nav-item', isActive && 'active')}
          >
            <Icon className="ico" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-section">Games</div>
      <nav className="sidebar-nav">
        {games?.map((game) => (
          <NavLink
            key={game.slug}
            to={ROUTES.game(game.slug)}
            className={({ isActive }) => clsx('nav-item', isActive && 'active')}
          >
            <span
              className={clsx(
                'dot',
                game.status === 'active' ? 'dot-live' : 'dot-muted',
              )}
              style={{ marginLeft: 2, marginRight: 2 }}
            />
            <span className="t-mono t-sm">{game.slug}</span>
            <span className="count" style={{ background: 'transparent' }}>
              n{game.nights_elapsed}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="row gap-8" style={{ alignItems: 'center' }}>
          <div className={clsx('dot', connected ? 'dot-success' : 'dot-danger')} />
          <div className="col flex-1" style={{ lineHeight: 1.2 }}>
            <div className="t-xs t-mono t-dim">
              {connected ? 'connected' : 'disconnected'}
            </div>
            <div className="t-xs t-muted">agency · webui</div>
          </div>
          <span className="kbd">⌘K</span>
        </div>
      </div>
    </aside>
  )
}
