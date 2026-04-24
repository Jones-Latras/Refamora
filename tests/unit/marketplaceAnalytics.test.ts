import { equal } from 'node:assert/strict'

import {
  calculateRate,
  rankOccurrences,
} from '../../utils/marketplaceAnalytics'

function runTest(name: string, callback: () => void) {
  callback()
  console.log(`PASS ${name}`)
}

runTest('calculateRate returns rounded percentages and null for empty denominators', () => {
  equal(calculateRate(5, 8), 63)
  equal(calculateRate(0, 0), null)
})

runTest('rankOccurrences sorts by count then label and drops blank values', () => {
  const result = rankOccurrences(
    ['Cebu', 'Davao', 'Cebu', '', null, 'Davao', 'Baguio', 'Cebu'],
    2,
  )

  equal(
    JSON.stringify(result),
    JSON.stringify([
      { label: 'Cebu', count: 3 },
      { label: 'Davao', count: 2 },
    ]),
  )
})
