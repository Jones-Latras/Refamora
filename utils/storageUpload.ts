export function shouldRetryStorageUpload(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''

  const normalizedMessage = message.trim().toLowerCase()

  if (!normalizedMessage) {
    return false
  }

  return (
    normalizedMessage.includes('network request failed') ||
    normalizedMessage.includes('fetch failed') ||
    normalizedMessage.includes('timed out') ||
    normalizedMessage.includes('timeout') ||
    normalizedMessage.includes('connection reset') ||
    normalizedMessage.includes('temporarily unavailable') ||
    normalizedMessage.includes('503') ||
    normalizedMessage.includes('504')
  )
}

export function getStorageUploadRetryDelayMs(attemptNumber: number) {
  return Math.min(Math.max(attemptNumber, 1) * 800, 2400)
}
