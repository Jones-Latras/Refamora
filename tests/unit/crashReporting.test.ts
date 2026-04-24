import { equal } from 'node:assert/strict'

import {
  createCrashFingerprint,
  serializeCrashError,
} from '../../utils/crashReporting'

function runTest(name: string, callback: () => void) {
  callback()
  console.log(`PASS ${name}`)
}

runTest('serializeCrashError extracts message and stack from Error instances', () => {
  const error = new Error('Render failed')
  const result = serializeCrashError(error)

  equal(result.message, 'Render failed')
  equal(typeof result.stack, 'string')
})

runTest('serializeCrashError falls back for string and unknown values', () => {
  equal(serializeCrashError('fatal').message, 'fatal')
  equal(serializeCrashError({}).message, 'Unknown error')
})

runTest('createCrashFingerprint normalizes equivalent crash signatures', () => {
  const left = createCrashFingerprint({
    source: 'react_error_boundary',
    message: ' Render failed ',
    route: '/(buyer)/feed',
    stack: 'Stack line',
  })
  const right = createCrashFingerprint({
    source: 'REACT_ERROR_BOUNDARY',
    message: 'render failed',
    route: '/(buyer)/feed',
    stack: 'stack line',
  })

  equal(left, right)
})
