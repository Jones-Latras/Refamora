import { equal } from 'node:assert/strict'

import {
  compareVersions,
  isVersionBelowMinimum,
  normalizeVersionSegments,
} from '../../utils/appVersion'

function runTest(name: string, callback: () => void) {
  callback()
  console.log(`PASS ${name}`)
}

runTest('normalizeVersionSegments parses numeric version parts and ignores suffixes', () => {
  equal(JSON.stringify(normalizeVersionSegments('1.2.3-beta.4')), JSON.stringify([1, 2, 3, 4]))
  equal(JSON.stringify(normalizeVersionSegments(' 2.0 ')), JSON.stringify([2, 0]))
})

runTest('compareVersions handles equal and greater semantic versions', () => {
  equal(compareVersions('1.0.0', '1.0.0'), 0)
  equal(compareVersions('1.2.0', '1.1.9'), 1)
  equal(compareVersions('2.0', '2.0.0'), 0)
})

runTest('isVersionBelowMinimum detects outdated builds only', () => {
  equal(isVersionBelowMinimum('1.0.0', '1.0.1'), true)
  equal(isVersionBelowMinimum('1.3.0', '1.2.9'), false)
  equal(isVersionBelowMinimum('', '1.0.0'), false)
})
