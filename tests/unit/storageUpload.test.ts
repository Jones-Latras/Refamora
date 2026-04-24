import { equal } from 'node:assert/strict'

import {
  getStorageUploadRetryDelayMs,
  shouldRetryStorageUpload,
} from '../../utils/storageUpload'

function runTest(name: string, callback: () => void) {
  callback()
  console.log(`PASS ${name}`)
}

runTest('shouldRetryStorageUpload detects transient network and timeout failures', () => {
  equal(shouldRetryStorageUpload(new Error('Network request failed')), true)
  equal(shouldRetryStorageUpload(new Error('Fetch failed with 503 Service Unavailable')), true)
  equal(shouldRetryStorageUpload('The request timed out.'), true)
  equal(shouldRetryStorageUpload(new Error('row-level security policy violation')), false)
})

runTest('getStorageUploadRetryDelayMs increases by attempt and caps reasonably', () => {
  equal(getStorageUploadRetryDelayMs(1), 800)
  equal(getStorageUploadRetryDelayMs(2), 1600)
  equal(getStorageUploadRetryDelayMs(99), 2400)
})
