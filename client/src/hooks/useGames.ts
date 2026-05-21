import { useQuery } from '@tanstack/react-query'
import type { Game } from '../types'
import { fetchJson, API } from '../utils/api'

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
