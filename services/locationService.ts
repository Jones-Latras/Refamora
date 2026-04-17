import * as ExpoLocation from 'expo-location'

import type { ServiceResult } from '../types/app'

type Coordinates = {
  latitude: number
  longitude: number
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

    const position = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    })

    return {
      data: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
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
