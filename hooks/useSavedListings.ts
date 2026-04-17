import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type SavedListingsState = {
  listingIds: string[]
  toggleListing: (listingId: string) => boolean
  isSaved: (listingId: string) => boolean
}

const MAX_SAVED_LISTINGS = 24

export const useSavedListingsStore = create<SavedListingsState>()(
  persist(
    (set, get) => ({
      listingIds: [],
      toggleListing: (listingId) => {
        const alreadySaved = get().listingIds.includes(listingId)

        set((state) => ({
          listingIds: alreadySaved
            ? state.listingIds.filter((id) => id !== listingId)
            : [listingId, ...state.listingIds].slice(0, MAX_SAVED_LISTINGS),
        }))

        return !alreadySaved
      },
      isSaved: (listingId) => get().listingIds.includes(listingId),
    }),
    {
      name: 'saved-listings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        listingIds: state.listingIds,
      }),
    },
  ),
)
