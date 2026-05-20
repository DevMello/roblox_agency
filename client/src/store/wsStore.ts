import { create } from 'zustand'

interface WSStore {
  connected: boolean
  reconnectAttempts: number
  lastEventType: string | null
  setConnected: (connected: boolean) => void
  incrementReconnect: () => void
  resetReconnect: () => void
  setLastEventType: (eventType: string | null) => void
}

export const useWsStore = create<WSStore>((set) => ({
  connected: false,
  reconnectAttempts: 0,
  lastEventType: null,
  setConnected: (connected) => set({ connected }),
  incrementReconnect: () =>
    set((s) => ({ reconnectAttempts: s.reconnectAttempts + 1 })),
  resetReconnect: () => set({ reconnectAttempts: 0 }),
  setLastEventType: (lastEventType) => set({ lastEventType }),
}))
