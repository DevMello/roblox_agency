import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useGame } from '../hooks/useGames'
import { ROUTES } from '../router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type TabId = 'overview' | 'sprint' | 'plan' | 'progress' | 'overrides' | 'blockers'

interface SprintLog {
  content: string
  tasks: any[]
}

interface TextContent {
  content: string
}

export default function GameDetail() {
  const { game: gameSlug } = useParams<{ game: string }>()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  if (!gameSlug) {
    return <div className="p-8 text-danger">Missing game parameter</div>
  }

  const { data: gameState, isLoading: stateLoading, error: stateError } = useGame(gameSlug)

  // Fetch sprint log
  const { data: sprintData, isLoading: sprintLoading } = useQuery<SprintLog>({
    queryKey: ['game', gameSlug, 'sprint'],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/sprint-log`).then((r) => r.json()),
    enabled: activeTab === 'sprint',
  })

  // Fetch plan
  const { data: planData, isLoading: planLoading } = useQuery<TextContent>({
    queryKey: ['game', gameSlug, 'plan'],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/plan`).then((r) => r.json()),
    enabled: activeTab === 'plan',
  })

  // Fetch progress
  const { data: progressData, isLoading: progressLoading } = useQuery<TextContent>({
    queryKey: ['game', gameSlug, 'progress'],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/progress`).then((r) => r.json()),
    enabled: activeTab === 'progress',
  })

  // Fetch overrides
  const { data: overridesData, isLoading: overridesLoading } = useQuery<TextContent>({
    queryKey: ['game', gameSlug, 'overrides'],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/overrides`).then((r) => r.json()),
    enabled: activeTab === 'overrides',
  })

  // Fetch blockers
  const { data: blockersData, isLoading: blockersLoading } = useQuery<any[]>({
    queryKey: ['game', gameSlug, 'blockers'],
    queryFn: () => fetch(`/api/v1/games/${gameSlug}/blockers`).then((r) => r.json()),
    enabled: activeTab === 'blockers',
  })

  if (stateLoading) {
    return <div className="p-8 text-text-muted font-mono text-sm">Loading game...</div>
  }

  if (stateError || !gameState) {
    return (
      <div className="p-8">
        <div className="mb-4">
          <Link to={ROUTES.projects} className="text-accent hover:underline">
            ← Back to Projects
          </Link>
        </div>
        <div className="text-danger font-mono text-sm">
          Game not found or failed to load
        </div>
      </div>
    )
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'sprint', label: 'Sprint Log' },
    { id: 'plan', label: 'Plan' },
    { id: 'progress', label: 'Progress' },
    { id: 'overrides', label: 'Overrides' },
    { id: 'blockers', label: 'Blockers' },
  ]

  function humanize(slug: string): string {
    return slug
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={ROUTES.projects} className="text-accent hover:text-accent/80">
              ← Projects
            </Link>
            <h1 className="text-text-primary font-display font-bold text-2xl">
              {humanize(gameState.name || gameSlug)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.run(gameSlug)}
              className="px-3 py-1.5 rounded bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors"
            >
              Run Sprint
            </Link>
            <Link
              to={ROUTES.edit(gameSlug)}
              className="px-3 py-1.5 rounded bg-surface border border-border text-text-primary text-xs font-semibold hover:bg-border transition-colors"
            >
              Live Edit
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border -mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-4 ${
                activeTab === tab.id
                  ? 'text-accent border-accent'
                  : 'text-text-muted border-transparent hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6 max-w-4xl">
            <section>
              <h2 className="text-text-primary font-semibold mb-3">Summary</h2>
              <div className="bg-surface border border-border rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Slug:</span>
                  <span className="font-mono text-text-primary">{gameState.slug}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Current Sprint:</span>
                  <span className="font-mono text-text-primary">
                    {gameState.current_sprint ?? 'None'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Tasks Completed:</span>
                  <span className="font-mono text-accent">
                    {gameState.tasks_done} / {gameState.task_count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Milestones:</span>
                  <span className="font-mono text-text-primary">
                    {gameState.milestones_done} / {gameState.milestone_count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Open PRs:</span>
                  <span className="font-mono text-text-primary">{gameState.open_pr_count}</span>
                </div>
                {gameState.blocker_count > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Blockers:</span>
                    <span className="font-mono text-danger">{gameState.blocker_count}</span>
                  </div>
                )}
                {gameState.last_run_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Last Run:</span>
                    <span className="font-mono text-text-primary">
                      {new Date(gameState.last_run_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-text-primary font-semibold mb-3">Actions</h2>
              <div className="flex gap-2">
                <Link
                  to={ROUTES.run(gameSlug)}
                  className="px-4 py-2 rounded bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors"
                >
                  Start Sprint Run
                </Link>
                <Link
                  to={ROUTES.edit(gameSlug)}
                  className="px-4 py-2 rounded bg-surface border border-border text-text-primary text-sm font-semibold hover:bg-border transition-colors"
                >
                  Live Edit
                </Link>
                <Link
                  to={ROUTES.gameRepo(gameSlug)}
                  className="px-4 py-2 rounded bg-surface border border-border text-text-primary text-sm font-semibold hover:bg-border transition-colors"
                >
                  View Repo
                </Link>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'sprint' && (
          <div className="p-6 max-w-4xl">
            {sprintLoading ? (
              <div className="text-text-muted font-mono text-sm">Loading...</div>
            ) : sprintData ? (
              <div className="prose-md prose-dark max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {sprintData.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-text-muted font-mono text-sm">No sprint log yet</div>
            )}
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="p-6 max-w-4xl">
            {planLoading ? (
              <div className="text-text-muted font-mono text-sm">Loading...</div>
            ) : planData ? (
              <div className="prose-md prose-dark max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {planData.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-text-muted font-mono text-sm">No plan yet</div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="p-6 max-w-4xl">
            {progressLoading ? (
              <div className="text-text-muted font-mono text-sm">Loading...</div>
            ) : progressData ? (
              <div className="prose-md prose-dark max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {progressData.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-text-muted font-mono text-sm">No progress log yet</div>
            )}
          </div>
        )}

        {activeTab === 'overrides' && (
          <div className="p-6 max-w-4xl">
            {overridesLoading ? (
              <div className="text-text-muted font-mono text-sm">Loading...</div>
            ) : overridesData ? (
              <div className="prose-md prose-dark max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {overridesData.content || 'No overrides'}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-text-muted font-mono text-sm">No overrides</div>
            )}
          </div>
        )}

        {activeTab === 'blockers' && (
          <div className="p-6 max-w-4xl">
            {blockersLoading ? (
              <div className="text-text-muted font-mono text-sm">Loading...</div>
            ) : blockersData && blockersData.length > 0 ? (
              <div className="space-y-3">
                {blockersData.map((blocker) => (
                  <div
                    key={blocker.id}
                    className="bg-surface border border-danger/20 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-text-primary font-semibold">{blocker.title}</h3>
                        <p className="text-text-muted font-mono text-xs mt-1">{blocker.id}</p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-mono font-semibold bg-danger/10 text-danger">
                        {blocker.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-text-muted font-mono text-sm">No blockers</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
