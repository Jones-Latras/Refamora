import type { MarketplaceAnalyticsBreakdownItem } from '../types/app'

export function calculateRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return null
  }

  return Math.round((numerator / denominator) * 100)
}

export function rankOccurrences(
  values: Array<string | null | undefined>,
  limit = 3,
): MarketplaceAnalyticsBreakdownItem[] {
  const counts = new Map<string, number>()

  for (const rawValue of values) {
    const value = rawValue?.trim()

    if (!value) {
      continue
    }

    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }

      return left[0].localeCompare(right[0])
    })
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}
