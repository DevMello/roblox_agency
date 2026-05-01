// Shared TypeScript interfaces for the Agency UI
// Matches the data models in §13 of the architecture spec

export interface Game {
  name: string
  slug: string
  spec_path: string
  plan_path: string
  sprint_log_path: string
  progress_path: string
  current_sprint: number
  milestone_count: number
  milestones_done: number
  task_count: number
  tasks_done: number
  open_pr_count: number
  blocker_count: number
  last_run_at: string | null
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
  branch: string
  game: string
  status: 'open' | 'merged' | 'closed'
  labels: string[]
  qa_verdict: 'approved' | 'failed' | null
  created_at: string
  diff_url: string
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
  last_commit: string | null
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
  | { type: 'run.log'; run_id: string; line: string; agent: string }
  | { type: 'run.task'; run_id: string; task: Partial<Task> }
  | { type: 'run.status'; run_id: string; status: RunStatus }
  | { type: 'git.pr'; action: 'opened' | 'merged' | 'closed'; pr: PR }
  | { type: 'git.commit'; commit: Commit }
  | { type: 'file.changed'; path: string }
  | { type: 'schedule.fired'; job_id: string; run_id: string }
  | { type: 'mcp.health'; server: string; status: 'up' | 'down' }
