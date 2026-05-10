import { create } from 'zustand'
import type { AuthSession } from '@ueno/types'

interface AuthState {
  session: AuthSession | null
  isLoading: boolean
  setSession: (session: AuthSession | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ session: null, isLoading: false }),
}))
