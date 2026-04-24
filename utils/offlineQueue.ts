export function getOfflineQueueRetryDelayMs(attemptCount: number) {
  const normalizedAttempts = Math.max(1, Math.trunc(attemptCount))
  return Math.min(normalizedAttempts * 5000, 60000)
}

export function shouldAttemptOfflineQueueSync(input: {
  attemptCount: number
  lastAttemptAt: string | null
  now?: number
}) {
  if (!input.lastAttemptAt) {
    return true
  }

  const nextAllowedAttemptAt =
    new Date(input.lastAttemptAt).getTime() +
    getOfflineQueueRetryDelayMs(input.attemptCount)

  return (input.now ?? Date.now()) >= nextAllowedAttemptAt
}
