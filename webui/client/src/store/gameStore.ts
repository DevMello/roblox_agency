// Stub — full implementation provided by frontend-stores-hooks worker
import { create } from 'zustand'
import type { Game } from '../types'

interface GameStore {
  games: Game[]
  activeGame: string | null
  setGames: (games: Game[]) => void
  setActiveGame: (slug: string | null) => void
}

export const useGameStore = create<GameStore>((set) => ({
  games: [],
  activeGame: null,
  setGames: (games) => set({ games }),
  setActiveGame: (slug) => set({ activeGame: slug }),
}))
