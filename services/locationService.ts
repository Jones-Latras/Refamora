import * as ExpoLocation from 'expo-location'

import type { ServiceResult } from '../types/app'

type Coordinates = {
  latitude: number
  longitude: number
  accuracyMeters: number | null
  capturedAt: string
}

export async function requestCurrentCoordinates(): Promise<
  ServiceResult<Coordinates>
> {
  try {
    const permission = await ExpoLocation.requestForegroundPermissionsAsync()

    if (permission.status !== 'granted') {
      return {
        data: null,
        error: new Error('Location permission was not granted.'),
      }
    }

    const lastKnownPosition = await ExpoLocation.getLastKnownPositionAsync({
      maxAge: 60_000,
      requiredAccuracy: 75,
    })

    const position =
      lastKnownPosition ??
      (await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Highest,
        distanceInterval: 1,
        mayShowUserSettingsDialog: true,
      }))

    return {
      data: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy ?? null,
        capturedAt: new Date(position.timestamp).toISOString(),
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error('Unable to get your current location right now.'),
    }
  }
}
