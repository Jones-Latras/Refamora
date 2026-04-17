import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { ListingFormValues } from '../utils/schemas'

type ListingDraftRecord = {
  userId: string
  values: ListingFormValues
  updatedAt: string
}

type ListingDraftState = {
  draftsByUser: Record<string, ListingDraftRecord>
  saveDraft: (userId: string, values: ListingFormValues) => void
  clearDraft: (userId: string) => void
}

export const useListingDraftStore = create<ListingDraftState>()(
  persist(
    (set) => ({
      draftsByUser: {},
      saveDraft: (userId, values) =>
        set((state) => ({
          draftsByUser: {
            ...state.draftsByUser,
            [userId]: {
              userId,
              values,
              updatedAt: new Date().toISOString(),
            },
          },
        })),
      clearDraft: (userId) =>
        set((state) => {
          const nextDrafts = { ...state.draftsByUser }
          delete nextDrafts[userId]

          return {
            draftsByUser: nextDrafts,
          }
        }),
    }),
    {
      name: 'listing-drafts',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
