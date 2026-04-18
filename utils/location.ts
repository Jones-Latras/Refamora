type Coordinates = {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_KM = 6371

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function getDistanceKm(from: Coordinates, to: Coordinates) {
  const latDelta = toRadians(to.latitude - from.latitude)
  const lonDelta = toRadians(to.longitude - from.longitude)
  const startLat = toRadians(from.latitude)
  const endLat = toRadians(to.latitude)

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLat) *
      Math.cos(endLat) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

export function formatDistanceAway(
  distanceKm: number,
  accuracyMeters?: number | null,
) {
  const roundedAccuracy =
    typeof accuracyMeters === 'number' && Number.isFinite(accuracyMeters)
      ? Math.max(0, Math.round(accuracyMeters))
      : null
  const isApproximate = roundedAccuracy != null && roundedAccuracy > 120

  if (distanceKm < 1) {
    const meterStep = isApproximate ? 50 : 10
    const metersAway = Math.max(
      meterStep,
      Math.round((distanceKm * 1000) / meterStep) * meterStep,
    )

    return `${isApproximate ? 'About ' : ''}${metersAway} m away`
  }

  if (distanceKm < 5) {
    return `${isApproximate ? 'About ' : ''}${distanceKm.toFixed(
      isApproximate ? 1 : 2,
    )} km away`
  }

  if (distanceKm < 20) {
    return `${isApproximate ? 'About ' : ''}${distanceKm.toFixed(1)} km away`
  }

  return `${isApproximate ? 'About ' : ''}${Math.round(distanceKm)} km away`
}
