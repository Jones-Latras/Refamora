import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type {
  ContactConversation,
  ContactRequestSummary,
  ListingDetail,
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
  listingDetailsById: Record<string, OfflineSnapshot<ListingDetail>>
  relatedListingsByListingId: Record<string, OfflineSnapshot<ListingPreview[]>>
  buyerRequestsByUser: Record<string, OfflineSnapshot<ContactRequestSummary[]>>
  sellerRequestsByUser: Record<string, OfflineSnapshot<ContactRequestSummary[]>>
  conversationsById: Record<string, OfflineSnapshot<ContactConversation>>
  markHydrated: () => void
  setBuyerFeed: (items: ListingPreview[]) => void
  setMapPins: (items: ListingPin[]) => void
  setListingDetail: (listingId: string, item: ListingDetail) => void
  setRelatedListings: (listingId: string, items: ListingPreview[]) => void
  setBuyerRequests: (userId: string, items: ContactRequestSummary[]) => void
  setSellerRequests: (userId: string, items: ContactRequestSummary[]) => void
  setConversation: (requestId: string, item: ContactConversation) => void
  removeListing: (listingId: string) => void
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
      listingDetailsById: {},
      relatedListingsByListingId: {},
      buyerRequestsByUser: {},
      sellerRequestsByUser: {},
      conversationsById: {},
      markHydrated: () => set({ hydrated: true }),
      setBuyerFeed: (items) =>
        set({
          buyerFeed: createSnapshot(items),
        }),
      setMapPins: (items) =>
        set({
          mapPins: createSnapshot(items),
        }),
      setListingDetail: (listingId, item) =>
        set((state) => ({
          listingDetailsById: {
            ...state.listingDetailsById,
            [listingId]: createSnapshot(item),
          },
        })),
      setRelatedListings: (listingId, items) =>
        set((state) => ({
          relatedListingsByListingId: {
            ...state.relatedListingsByListingId,
            [listingId]: createSnapshot(items),
          },
        })),
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
      setConversation: (requestId, item) =>
        set((state) => ({
          conversationsById: {
            ...state.conversationsById,
            [requestId]: createSnapshot(item),
          },
        })),
      removeListing: (listingId) =>
        set((state) => {
          const { [listingId]: _removedDetail, ...listingDetailsById } =
            state.listingDetailsById
          const { [listingId]: _removedRelated, ...relatedListingsByListingId } =
            state.relatedListingsByListingId

          return {
            buyerFeed: createSnapshot(
              state.buyerFeed.items.filter((listing) => listing.id !== listingId),
            ),
            mapPins: createSnapshot(
              state.mapPins.items.filter((pin) => pin.id !== listingId),
            ),
            listingDetailsById,
            relatedListingsByListingId: Object.fromEntries(
              Object.entries(relatedListingsByListingId).map(([relatedListingId, snapshot]) => [
                relatedListingId,
                createSnapshot(
                  snapshot.items.filter((listing) => listing.id !== listingId),
                ),
              ]),
            ),
          }
        }),
    }),
    {
      name: 'offline-data',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        buyerFeed: state.buyerFeed,
        mapPins: state.mapPins,
        listingDetailsById: state.listingDetailsById,
        relatedListingsByListingId: state.relatedListingsByListingId,
        buyerRequestsByUser: state.buyerRequestsByUser,
        sellerRequestsByUser: state.sellerRequestsByUser,
        conversationsById: state.conversationsById,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated()
      },
    },
  ),
)
