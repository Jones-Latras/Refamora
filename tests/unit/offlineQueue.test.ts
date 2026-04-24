import { equal } from 'node:assert/strict'

import {
  getOfflineQueueRetryDelayMs,
  shouldAttemptOfflineQueueSync,
} from '../../utils/offlineQueue'

function runTest(name: string, callback: () => void) {
  callback()
  console.log(`PASS ${name}`)
}

runTest('getOfflineQueueRetryDelayMs scales with attempts and caps at one minute', () => {
  equal(getOfflineQueueRetryDelayMs(1), 5000)
  equal(getOfflineQueueRetryDelayMs(3), 15000)
  equal(getOfflineQueueRetryDelayMs(99), 60000)
})

runTest('shouldAttemptOfflineQueueSync respects retry backoff windows', () => {
  equal(
    shouldAttemptOfflineQueueSync({
      attemptCount: 2,
      lastAttemptAt: '2026-04-24T00:00:00.000Z',
      now: new Date('2026-04-24T00:00:09.000Z').getTime(),
    }),
    false,
  )
  equal(
    shouldAttemptOfflineQueueSync({
      attemptCount: 2,
      lastAttemptAt: '2026-04-24T00:00:00.000Z',
      now: new Date('2026-04-24T00:00:10.000Z').getTime(),
    }),
    true,
  )
})
