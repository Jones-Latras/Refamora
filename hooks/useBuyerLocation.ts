import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type BuyerCoordinates = {
  latitude: number
  longitude: number
  accuracyMeters?: number | null
  capturedAt?: string
}

type BuyerLocationState = {
  coordinates: BuyerCoordinates | null
  updatedAt: string | null
  setCoordinates: (coordinates: BuyerCoordinates) => void
  clearCoordinates: () => void
}

export const useBuyerLocationStore = create<BuyerLocationState>()(
  persist(
    (set) => ({
      coordinates: null,
      updatedAt: null,
      setCoordinates: (coordinates) =>
        set({
          coordinates,
          updatedAt: new Date().toISOString(),
        }),
      clearCoordinates: () =>
        set({
          coordinates: null,
          updatedAt: null,
        }),
    }),
    {
      name: 'buyer-location',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
