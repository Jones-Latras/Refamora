import { create } from 'zustand'

type RecentlyViewedState = {
  listingIds: string[]
  addListing: (listingId: string) => void
}

const MAX_RECENTLY_VIEWED = 5

export const useRecentlyViewedStore = create<RecentlyViewedState>((set) => ({
  listingIds: [],
  addListing: (listingId: string) =>
    set((state) => {
      const nextIds = [listingId, ...state.listingIds.filter((id) => id !== listingId)]

      return {
        listingIds: nextIds.slice(0, MAX_RECENTLY_VIEWED),
      }
    }),
}))
