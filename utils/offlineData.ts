export function shouldUseOfflineSnapshot(input: {
  isOffline: boolean
  liveItemCount: number
  snapshotItemCount: number
}) {
  return input.isOffline && input.liveItemCount === 0 && input.snapshotItemCount > 0
}

export function formatOfflineSnapshotUpdatedAt(value: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
