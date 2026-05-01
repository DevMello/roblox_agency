// Stub — full implementation provided by frontend-stores-hooks worker
import { create } from 'zustand'
import type { Run, Task } from '../types'

interface RunStore {
  activeRun: Run | null
  tasks: Task[]
  logs: string[]
  setActiveRun: (run: Run | null) => void
  setTasks: (tasks: Task[]) => void
  appendLog: (line: string) => void
  clearLogs: () => void
}

export const useRunStore = create<RunStore>((set) => ({
  activeRun: null,
  tasks: [],
  logs: [],
  setActiveRun: (run) => set({ activeRun: run }),
  setTasks: (tasks) => set({ tasks }),
  appendLog: (line) => set((s) => ({ logs: [...s.logs.slice(-2000), line] })),
  clearLogs: () => set({ logs: [] }),
}))
