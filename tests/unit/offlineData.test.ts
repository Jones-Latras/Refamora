import { equal } from 'node:assert/strict'

import {
  formatOfflineSnapshotUpdatedAt,
  shouldUseOfflineSnapshot,
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
