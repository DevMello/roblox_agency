import { create } from 'zustand'
import type { Game } from '../types'

interface GameStore {
  games: Game[]
  activeGame: string | null
  isLoading: boolean
  error: string | null
  setGames: (games: Game[]) => void
  setActiveGame: (slug: string | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  getGame: (name: string) => Game | undefined
}

export const useGameStore = create<GameStore>((set, get) => ({
  games: [],
  activeGame: null,
  isLoading: false,
  error: null,
  setGames: (games) => set({ games }),
  setActiveGame: (slug) => set({ activeGame: slug }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  getGame: (name) => get().games.find((g) => g.name === name || g.slug === name),
}))
