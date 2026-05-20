import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Run, RunScript, Task } from '../types'

const API = '/api/v1'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

interface RunDetails {
  id: string
  game: string | null
  script: RunScript
  status: Run['status']
  started_at: string
  ended_at: string | null
  exit_code: number | null
  pid: number | null
  logs: string[]
  is_alive: boolean
}

export function useRun(runId?: string) {
  const queryClient = useQueryClient()

  const runQuery = useQuery<RunDetails>({
    queryKey: ['run', runId],
    queryFn: () => fetchJson<RunDetails>(`${API}/runs/${runId}`),
    enabled: runId !== undefined && runId !== '',
  })

  const launchMutation = useMutation<Run, Error, { script: RunScript; game: string }>({
    mutationFn: ({ script, game }) => {
      if (script === 'night-cycle' || script === 'architect') {
        return fetchJson<Run>(`${API}/runs/${script}/${game}`, { method: 'POST' })
      }
      throw new Error(`Unsupported launch script: ${script}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['runs'] })
    },
  })

  const killMutation = useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) =>
      fetchJson<void>(`${API}/runs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['runs'] })
      if (runId) {
        void queryClient.invalidateQueries({ queryKey: ['run', runId] })
      }
    },
  })

  return {
    run: runQuery.data ?? null,
    tasks: [] as Task[],
    logs: runQuery.data?.logs ?? [],
    isLoading: runQuery.isLoading,
    error: runQuery.error,
    launch: launchMutation,
    kill: killMutation,
  }
}

export function useRunList() {
  return useQuery<Run[]>({
    queryKey: ['runs'],
    queryFn: () => fetchJson<Run[]>(`${API}/runs/`),
    refetchInterval: 5000,
  })
}
