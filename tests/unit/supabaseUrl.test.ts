import { equal } from 'node:assert/strict'

import {
  getExpoDevHost,
  isLoopbackHost,
  isPrivateIpv4Host,
  resolveSupabaseUrl,
} from '../../utils/supabaseUrl'

function runTest(name: string, callback: () => void) {
  callback()
  console.log(`PASS ${name}`)
}

runTest('getExpoDevHost returns the first usable host candidate', () => {
  const result = getExpoDevHost([undefined, '192.168.1.20:8081', '10.0.0.4:8081'])

  equal(result, '192.168.1.20')
})

runTest('isLoopbackHost identifies loopback hosts only', () => {
  equal(isLoopbackHost('127.0.0.1'), true)
  equal(isLoopbackHost('localhost'), true)
  equal(isLoopbackHost('192.168.1.4'), false)
})

runTest('isPrivateIpv4Host detects private LAN ranges', () => {
  equal(isPrivateIpv4Host('10.0.0.15'), true)
  equal(isPrivateIpv4Host('172.16.5.8'), true)
  equal(isPrivateIpv4Host('192.168.1.44'), true)
  equal(isPrivateIpv4Host('8.8.8.8'), false)
})

runTest('resolveSupabaseUrl rewrites local development Supabase hosts to the Expo LAN host', () => {
  const result = resolveSupabaseUrl(
    'http://127.0.0.1:54321',
    '192.168.1.20',
    true,
  )

  equal(result, 'http://192.168.1.20:54321')
})

runTest('resolveSupabaseUrl leaves production or non-local URLs unchanged', () => {
  equal(
    resolveSupabaseUrl('https://project.supabase.co', '192.168.1.20', true),
    'https://project.supabase.co',
  )
  equal(
    resolveSupabaseUrl('http://127.0.0.1:54321', '192.168.1.20', false),
    'http://127.0.0.1:54321',
  )
})
