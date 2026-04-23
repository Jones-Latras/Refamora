export function normalizeVersionSegments(version: string | null | undefined) {
  return (version ?? '')
    .trim()
    .split('.')
    .map((segment) => {
      const match = segment.match(/\d+/)
      return match ? Number.parseInt(match[0], 10) : 0
    })
}

export function compareVersions(left: string | null | undefined, right: string | null | undefined) {
  const leftSegments = normalizeVersionSegments(left)
  const rightSegments = normalizeVersionSegments(right)
  const length = Math.max(leftSegments.length, rightSegments.length, 3)

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftSegments[index] ?? 0
    const rightValue = rightSegments[index] ?? 0

    if (leftValue > rightValue) {
      return 1
    }

    if (leftValue < rightValue) {
      return -1
    }
  }

  return 0
}

export function isVersionBelowMinimum(
  currentVersion: string | null | undefined,
  minimumSupportedVersion: string | null | undefined,
) {
  if (!currentVersion || !minimumSupportedVersion) {
    return false
  }

  return compareVersions(currentVersion, minimumSupportedVersion) < 0
}
