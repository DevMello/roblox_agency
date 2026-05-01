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
  run: Run
  tasks: Task[]
  logs: string[]
}

export function useRun(runId?: string) {
  const queryClient = useQueryClient()

  const runQuery = useQuery<RunDetails>({
    queryKey: ['run', runId],
    queryFn: () => fetchJson<RunDetails>(`${API}/runs/${runId}`),
    enabled: runId !== undefined && runId !== '',
  })

  const launchMutation = useMutation<Run, Error, { script: RunScript; game: string }>({
    mutationFn: ({ script, game }) =>
      fetchJson<Run>(`${API}/runs/${script}/${game}`, { method: 'POST' }),
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
    run: runQuery.data?.run ?? null,
    tasks: runQuery.data?.tasks ?? [],
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
