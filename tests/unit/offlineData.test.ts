import { equal } from 'node:assert/strict'

import {
  formatOfflineSnapshotUpdatedAt,
  shouldUseOfflineSnapshot,
  shouldUseOfflineSnapshotValue,
} from '../../utils/offlineData'

function runTest(name: string, callback: () => void) {
  callback()
  console.log(`PASS ${name}`)
}

runTest('shouldUseOfflineSnapshot only enables fallback when offline and snapshot exists', () => {
  equal(
    shouldUseOfflineSnapshot({
      isOffline: true,
      liveItemCount: 0,
      snapshotItemCount: 4,
    }),
    true,
  )
  equal(
    shouldUseOfflineSnapshot({
      isOffline: false,
      liveItemCount: 0,
      snapshotItemCount: 4,
    }),
    false,
  )
})

runTest('formatOfflineSnapshotUpdatedAt returns null for missing timestamps', () => {
  equal(formatOfflineSnapshotUpdatedAt(null), null)
})

runTest('shouldUseOfflineSnapshotValue falls back only when live data is unavailable', () => {
  equal(
    shouldUseOfflineSnapshotValue({
      isOffline: true,
      hasLiveValue: false,
      hasSnapshotValue: true,
    }),
    true,
  )
  equal(
    shouldUseOfflineSnapshotValue({
      isOffline: true,
      hasLiveValue: true,
      hasSnapshotValue: true,
    }),
    false,
  )
})
