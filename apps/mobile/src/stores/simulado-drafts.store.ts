import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type SimuladoDraft = {
  currentQuestionIndex: number
  answers: Record<string, string | string[]>
  confirmedAnswers: Record<string, boolean>
  elapsedSeconds: number
  respostaModo: 'durante' | 'depois'
}

type DraftState = {
  drafts: Record<string, Record<string, SimuladoDraft>>
  hydrated: boolean
  saveDraft: (userId: string, simuladoId: string, draft: SimuladoDraft) => void
  removeDraft: (userId: string, simuladoId: string) => void
}

export const useSimuladoDraftsStore = create<DraftState>()(persist((set) => ({
  drafts: {},
  hydrated: false,
  saveDraft: (userId, simuladoId, draft) => set((state) => ({
    drafts: {
      ...state.drafts,
      [userId]: { ...state.drafts[userId], [simuladoId]: draft },
    },
  })),
  removeDraft: (userId, simuladoId) => set((state) => {
    const userDrafts = { ...state.drafts[userId] }
    delete userDrafts[simuladoId]
    return { drafts: { ...state.drafts, [userId]: userDrafts } }
  }),
}), {
  name: 'simulado-drafts-v1',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ drafts: state.drafts }),
  onRehydrateStorage: () => (_state, error) => {
    if (error) console.warn('Não foi possível recuperar os simulados em andamento.', error)
    useSimuladoDraftsStore.setState({ hydrated: true })
  },
}))
