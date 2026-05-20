// Shared TypeScript interfaces for the Agency UI
// Matches the data models in §13 of the architecture spec

export interface Game {
  name: string
  slug: string
  status: string
  repo_url?: string | null
  created_at?: string | null
  // Game state (from game_state table)
  phase?: string | null
  active_milestone?: string | null
  nights_elapsed: number
  estimated_nights_to_mvp?: number | null
  tasks_total: number
  tasks_done: number
  tasks_pending: number
  tasks_failed: number
  tasks_blocked: number
  milestone_count: number
  milestones_done: number
  blocker_count: number
}

export interface Run {
  id: string
  game: string | null
  script: RunScript
  status: RunStatus
  started_at: string
  ended_at: string | null
  exit_code: number | null
  pid: number | null
}

export type RunScript =
  | 'night-cycle'
  | 'architect'
  | 'reporter'
  | 'live-edit'
  | 'worker'
  | 'weekly-research'

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

export interface Task {
  id: string
  title: string
  agent: 'planner' | 'builder' | 'qa' | 'reporter'
  worker_id: string | null
  status: TaskStatus
  started_at: string | null
  ended_at: string | null
  pr_number: number | null
  qa_verdict: 'approved' | 'failed' | null
  blocker_ref: string | null
  estimated_minutes: number
}

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked'

export interface PR {
  number: number
  title: string
  headRefName: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  url: string
  createdAt: string
}

export interface Blocker {
  id: string
  game: string
  description: string
  created_at: string
  resolved: boolean
  resolved_at: string | null
}

export interface Override {
  id: string
  game: string
  timestamp: string
  priority: 'normal' | 'high' | 'blocking'
  text: string
  status: 'active' | 'applied' | 'superseded'
}

export interface MCPServer {
  name: string
  type: 'bat' | 'url' | 'stdio'
  path_or_url: string
  status: 'connected' | 'disconnected' | 'unknown'
  ops_per_min: number
  ops_limit: number
}

export interface ScheduledJob {
  id: string
  label: string
  game: string
  script: string
  cron_expr: string
  timezone: string
  active: boolean
  next_run: string
  last_run: string | null
  last_run_status: 'ok' | 'failed' | null
}

export interface Branch {
  name: string
  is_current: boolean
  last_commit_sha: string
  last_commit_message: string
}

export interface Commit {
  sha: string
  message: string
  author: string
  date: string
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  modified?: string
}

// WebSocket event types
export type WSEvent =
  | { type: 'connected'; status: 'ok' }
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'run.log'; run_id?: string; line: string; agent?: string }
  | { type: 'run.task'; run_id?: string; task: Partial<Task> }
  | { type: 'run.status'; run_id?: string; status: RunStatus }
  | { type: 'git.commit'; commit: Commit }
  | { type: 'file.changed'; path: string }
  | { type: 'schedule.fired'; job_id: string; run_id: string }
  | { type: 'mcp.health'; server: string; status: 'up' | 'down' }
