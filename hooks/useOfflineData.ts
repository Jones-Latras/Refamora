import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type {
  ContactRequestSummary,
  ListingPin,
  ListingPreview,
} from '../types/app'

type OfflineSnapshot<T> = {
  items: T
  updatedAt: string | null
}

type OfflineDataState = {
  hydrated: boolean
  buyerFeed: OfflineSnapshot<ListingPreview[]>
  mapPins: OfflineSnapshot<ListingPin[]>
  buyerRequestsByUser: Record<string, OfflineSnapshot<ContactRequestSummary[]>>
  sellerRequestsByUser: Record<string, OfflineSnapshot<ContactRequestSummary[]>>
  markHydrated: () => void
  setBuyerFeed: (items: ListingPreview[]) => void
  setMapPins: (items: ListingPin[]) => void
  setBuyerRequests: (userId: string, items: ContactRequestSummary[]) => void
  setSellerRequests: (userId: string, items: ContactRequestSummary[]) => void
}

function createSnapshot<T>(items: T): OfflineSnapshot<T> {
  return {
    items,
    updatedAt: new Date().toISOString(),
  }
}

export const useOfflineDataStore = create<OfflineDataState>()(
  persist(
    (set) => ({
      hydrated: false,
      buyerFeed: {
        items: [],
        updatedAt: null,
      },
      mapPins: {
        items: [],
        updatedAt: null,
      },
      buyerRequestsByUser: {},
      sellerRequestsByUser: {},
      markHydrated: () => set({ hydrated: true }),
      setBuyerFeed: (items) =>
        set({
          buyerFeed: createSnapshot(items),
        }),
      setMapPins: (items) =>
        set({
          mapPins: createSnapshot(items),
        }),
      setBuyerRequests: (userId, items) =>
        set((state) => ({
          buyerRequestsByUser: {
            ...state.buyerRequestsByUser,
            [userId]: createSnapshot(items),
          },
        })),
      setSellerRequests: (userId, items) =>
        set((state) => ({
          sellerRequestsByUser: {
            ...state.sellerRequestsByUser,
            [userId]: createSnapshot(items),
          },
        })),
    }),
    {
      name: 'offline-data',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        buyerFeed: state.buyerFeed,
        mapPins: state.mapPins,
        buyerRequestsByUser: state.buyerRequestsByUser,
        sellerRequestsByUser: state.sellerRequestsByUser,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated()
      },
    },
  ),
)
