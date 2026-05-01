import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Branch, PR } from '../types'

const API = '/api/v1'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

interface GitData {
  branches: Branch[]
  prs: PR[]
}

export function useGit() {
  const queryClient = useQueryClient()

  const gitQuery = useQuery<GitData>({
    queryKey: ['git'],
    queryFn: () => fetchJson<GitData>(`${API}/git`),
  })

  const checkoutMutation = useMutation<void, Error, { branch: string }>({
    mutationFn: ({ branch }) =>
      fetchJson<void>(`${API}/git/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['git'] })
    },
  })

  const mergePrMutation = useMutation<void, Error, { prNumber: number }>({
    mutationFn: ({ prNumber }) =>
      fetchJson<void>(`${API}/git/prs/${prNumber}/merge`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['git'] })
    },
  })

  return {
    branches: gitQuery.data?.branches ?? [],
    prs: gitQuery.data?.prs ?? [],
    currentBranch: gitQuery.data?.branches.find((b) => b.is_current) ?? null,
    isLoading: gitQuery.isLoading,
    error: gitQuery.error,
    checkout: checkoutMutation,
    mergePr: mergePrMutation,
  }
}
