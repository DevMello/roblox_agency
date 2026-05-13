import { useQuery } from '@tanstack/react-query'
import type { Game } from '../types'

const API = '/api/v1'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function useGames() {
  return useQuery<Game[]>({
    queryKey: ['games'],
    queryFn: () => fetchJson<Game[]>(`${API}/games/`),
  })
}

export function useGame(name: string) {
  return useQuery<Game>({
    queryKey: ['games', name],
    queryFn: () => fetchJson<Game>(`${API}/games/${name}`),
    enabled: name !== '',
  })
}
