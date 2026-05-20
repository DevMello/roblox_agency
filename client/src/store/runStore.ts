import { create } from 'zustand'
import type { Run, Task, RunStatus } from '../types'

const MAX_LOGS = 2000

export type TaskUpdate = Partial<Task> & { id: string }

interface RunStore {
  activeRun: Run | null
  tasks: Task[]
  logs: string[]
  agentActivity: Record<string, string>
  setActiveRun: (run: Run | null) => void
  setTasks: (tasks: Task[]) => void
  appendLog: (line: string) => void
  clearLogs: () => void
  updateTask: (update: TaskUpdate) => void
  setRunStatus: (status: RunStatus) => void
  setAgentActivity: (agentActivity: Record<string, string>) => void
}

export const useRunStore = create<RunStore>((set) => ({
  activeRun: null,
  tasks: [],
  logs: [],
  agentActivity: {},
  setActiveRun: (run) => set({ activeRun: run }),
  setTasks: (tasks) => set({ tasks }),
  appendLog: (line) =>
    set((s) => {
      const next = s.logs.length >= MAX_LOGS
        ? [...s.logs.slice(s.logs.length - MAX_LOGS + 1), line]
        : [...s.logs, line]
      return { logs: next }
    }),
  clearLogs: () => set({ logs: [] }),
  updateTask: (update) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === update.id ? { ...t, ...update } : t
      ),
    })),
  setRunStatus: (status) =>
    set((s) => ({
      activeRun: s.activeRun ? { ...s.activeRun, status } : s.activeRun,
    })),
  setAgentActivity: (agentActivity) => set({ agentActivity }),
}))
