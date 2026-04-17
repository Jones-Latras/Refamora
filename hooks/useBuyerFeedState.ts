import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { ListingFilters } from '../types/app'

type BuyerFeedState = {
  hydrated: boolean
  query: string
  filters: ListingFilters
  markHydrated: () => void
  setQuery: (query: string) => void
  setFilters: (filters: ListingFilters) => void
  clear: () => void
}

export const useBuyerFeedStore = create<BuyerFeedState>()(
  persist(
    (set) => ({
      hydrated: false,
      query: '',
      filters: {},
      markHydrated: () => set({ hydrated: true }),
      setQuery: (query) => set({ query }),
      setFilters: (filters) => set({ filters }),
      clear: () => set({ query: '', filters: {} }),
    }),
    {
      name: 'buyer-feed-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        query: state.query,
        filters: state.filters,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated()
      },
    },
  ),
)
