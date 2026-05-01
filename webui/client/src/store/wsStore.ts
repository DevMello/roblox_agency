// Stub — full implementation provided by frontend-stores-hooks worker
import { create } from 'zustand'

type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WSStore {
  status: WSStatus
  setStatus: (status: WSStatus) => void
}

export const useWSStore = create<WSStore>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
}))
