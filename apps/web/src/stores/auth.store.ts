import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthSession } from '@ueno/types'

interface AuthState {
  session: AuthSession | null
  isLoading: boolean
  setSession: (session: AuthSession | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isLoading: true,
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      clear: () => set({ session: null }),
    }),
    {
      name: 'ueno-auth',
      partialize: (state) => ({ session: state.session }),
    },
  ),
)
