import { equal, ok } from 'node:assert/strict'

import {
  profileSchema,
  sellerVerificationSchema,
  signUpSchema,
} from '../../utils/schemas'

function runTest(name: string, callback: () => void) {
  callback()
  console.log(`PASS ${name}`)
}

runTest('signUpSchema accepts valid Philippine mobile numbers', () => {
  const localNumberResult = signUpSchema.safeParse({
    email: 'farmer@example.com',
    fullName: 'Maria Santos',
    phone: '09171234567',
    password: 'secret123',
    confirmPassword: 'secret123',
  })
  const internationalNumberResult = signUpSchema.safeParse({
    email: 'farmer@example.com',
    fullName: 'Maria Santos',
    phone: '+639171234567',
    password: 'secret123',
    confirmPassword: 'secret123',
  })

  equal(localNumberResult.success, true)
  equal(internationalNumberResult.success, true)
})

runTest('signUpSchema rejects mismatched confirmation passwords', () => {
  const result = signUpSchema.safeParse({
    email: 'farmer@example.com',
    fullName: 'Maria Santos',
    phone: '09171234567',
    password: 'secret123',
    confirmPassword: 'secret124',
  })

  equal(result.success, false)
  if (!result.success) {
    equal(result.error.issues[0]?.path[0], 'confirmPassword')
  }
})

runTest('profileSchema rejects numeric city names and accepts hyphenated ones', () => {
  const invalidCityResult = profileSchema.safeParse({
    full_name: 'Juan Dela Cruz',
    phone: '09171234567',
    city: 'Cagayan 2',
    avatar_url: null,
  })
  const validCityResult = profileSchema.safeParse({
    full_name: 'Juan Dela Cruz',
    phone: '09171234567',
    city: 'Kidapawan-City',
    avatar_url: null,
  })

  equal(invalidCityResult.success, false)
  equal(validCityResult.success, true)
})

runTest('sellerVerificationSchema enforces required document metadata', () => {
  const result = sellerVerificationSchema.safeParse({
    documentType: 'government_id',
    documentNumber: '  ',
    notes: 'Valid note',
  })

  equal(result.success, false)
  if (!result.success) {
    ok(
      result.error.issues.some((issue) => issue.path[0] === 'documentNumber'),
    )
  }
})
